import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { d1, UserRecord } from '@/lib/d1';
import { getCurrentSession } from '@/lib/auth/session';
import { apiRateLimiter } from '@/lib/kv';
import { searchPropertyOwners } from '@/lib/providers/property-owners';
import { deductCredits, getCreditsBalance } from '@/lib/services/credits';

export const dynamic = 'force-dynamic';

const propertySearchSchema = z.object({
  propertyType: z.enum(['all', 'chalet', 'cottage', 'condo', 'residential', 'vacation_rental']).default('all'),
  city: z.string().optional(),
  areaOrZipcode: z.string().optional(),
  country: z.string().default('United States'),
  requireMobile: z.boolean().default(false),
  requireEmail: z.boolean().default(false),
  limit: z.number().min(1).max(50).default(15),
});

export async function POST(req: NextRequest) {
  try {
    const apiKeyHeader =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    let user: UserRecord | null = null;

    if (apiKeyHeader) {
      user = await d1
        .prepare('SELECT * FROM users WHERE api_key = ?')
        .bind(apiKeyHeader)
        .first<UserRecord>();
    } else {
      const session = await getCurrentSession();
      if (session) {
        user = await d1
          .prepare('SELECT * FROM users WHERE id = ?')
          .bind(session.userId)
          .first<UserRecord>();
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Invalid API key or session.' }, { status: 401 });
    }

    const { success: rateLimitSuccess } = await apiRateLimiter.limit(user.id);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const body = await req.json();
    const validation = propertySearchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validation.error.format() }, { status: 400 });
    }

    // Check if user has custom Google Maps, DataForSEO, or Skip Trace key saved in provider settings
    let customGoogleKey: string | undefined;
    let customSkipTraceKey: string | undefined;
    let customDataForSeoKey: string | undefined;

    try {
      const providerRows = await d1
        .prepare('SELECT provider, api_key FROM user_provider_keys WHERE user_id = ? AND enabled = 1')
        .bind(user.id)
        .all<{ provider: string; api_key: string }>();

      for (const row of providerRows.results || []) {
        if (row.provider === 'google_maps' && row.api_key) customGoogleKey = row.api_key;
        if (row.provider === 'skip_trace' && row.api_key) customSkipTraceKey = row.api_key;
        if (row.provider === 'dataforseo' && row.api_key) customDataForSeoKey = row.api_key;
      }
    } catch {
      // ignore
    }

    const results = await searchPropertyOwners(validation.data, customGoogleKey, customSkipTraceKey, customDataForSeoKey);

    // Cost: 1 credit per 5 property records discovered (minimum 1)
    const cost = Math.max(1, Math.ceil(results.length / 5));
    const deductRes = await deductCredits(user.id, cost);
    const remaining = deductRes.success
      ? deductRes.balance
      : await getCreditsBalance(user.id);

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      creditsRemaining: remaining,
    });
  } catch (err: any) {
    console.error('❌ [API Properties] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
