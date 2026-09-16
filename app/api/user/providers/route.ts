import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { d1 } from '@/lib/d1';
import { getCurrentSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const providerSchema = z.object({
  provider: z.enum(['google_maps', 'dataforseo', 'hunter', 'custom_mcp']),
  apiKey: z.string().optional(),
  mcpEndpoint: z.string().optional(),
  enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = await d1
      .prepare('SELECT provider, mcp_endpoint, enabled, updated_at FROM user_provider_keys WHERE user_id = ?')
      .bind(session.userId)
      .all<any>();

    return NextResponse.json({
      success: true,
      providers: providers.results || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch providers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = providerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid provider configuration', details: validation.error.format() }, { status: 400 });
    }

    const { provider, apiKey, mcpEndpoint, enabled } = validation.data;
    const id = crypto.randomUUID();

    await d1
      .prepare(
        `INSERT INTO user_provider_keys (id, user_id, provider, api_key, mcp_endpoint, enabled, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, provider) DO UPDATE SET
           api_key = COALESCE(excluded.api_key, api_key),
           mcp_endpoint = COALESCE(excluded.mcp_endpoint, mcp_endpoint),
           enabled = excluded.enabled,
           updated_at = datetime('now')`
      )
      .bind(id, session.userId, provider, apiKey || null, mcpEndpoint || null, enabled ? 1 : 0)
      .run();

    return NextResponse.json({
      success: true,
      message: `Provider ${provider} updated successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update provider' }, { status: 500 });
  }
}
