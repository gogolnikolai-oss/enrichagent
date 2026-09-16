import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { d1, UserRecord } from '@/lib/d1';
import { getCurrentSession } from '@/lib/auth/session';
import { apiRateLimiter } from '@/lib/kv';
import { searchStartups } from '@/lib/providers/sec-edgar';
import { deductCredits, getCreditsBalance } from '@/lib/services/credits';

export const dynamic = 'force-dynamic';

const startupSearchSchema = z.object({
  timeWindowMonths: z.number().default(6),
  round: z.string().optional(),
  minFunding: z.number().optional(),
  industry: z.string().optional(),
  country: z.string().default('US'),
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
    const validation = startupSearchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validation.error.format() }, { status: 400 });
    }

    const startups = await searchStartups(validation.data);

    // Deduct 1 credit for the search batch
    if (startups.length > 0) {
      await deductCredits(user.id, 1);
    }

    const creditsRemaining = await getCreditsBalance(user.id);

    return NextResponse.json({
      success: true,
      results: startups,
      count: startups.length,
      creditsRemaining,
    });
  } catch (error: any) {
    console.error('Startup search error:', error);
    return NextResponse.json({ error: error.message || 'Failed to search startups' }, { status: 500 });
  }
}
