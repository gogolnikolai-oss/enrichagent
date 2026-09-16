import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { d1, UserRecord } from '@/lib/d1';
import { apiRateLimiter } from '@/lib/kv';
import { getCurrentSession } from '@/lib/auth/session';
import { enrichLead } from '@/lib/services/enrichment';
import { getCreditsBalance } from '@/lib/services/credits';

export const dynamic = 'force-dynamic';

const enrichRequestSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  title: z.string().optional(),
  requireMobile: z.boolean().default(false),
  includeCompanyData: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const apiKeyHeader = req.headers.get('x-api-key');
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
    const validationResult = enrichRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const { domain, title, requireMobile, includeCompanyData } = validationResult.data;

    const enrichmentResult = await enrichLead(
      { domain, title, requireMobile, includeCompanyData },
      user.id
    );

    if (enrichmentResult.contact) {
      // Save lead to user_saved_leads
      await d1
        .prepare(
          `INSERT OR IGNORE INTO user_saved_leads (id, user_id, contact_id)
           VALUES (?, ?, ?)`
        )
        .bind(crypto.randomUUID(), user.id, enrichmentResult.contact.id)
        .run();
    }

    const creditsRemaining = await getCreditsBalance(user.id);

    return NextResponse.json({
      success: true,
      data: enrichmentResult,
      creditsRemaining,
    });
  } catch (error: any) {
    console.error('Enrichment API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
