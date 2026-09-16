import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { d1, UserRecord } from '@/lib/d1';
import { Contact } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    let { leads, webhookUrl } = body as { leads: Contact[]; webhookUrl?: string };

    if (!webhookUrl) {
      const user = await d1
        .prepare('SELECT webhook_url FROM users WHERE id = ?')
        .bind(session.userId)
        .first<UserRecord>();

      if (user?.webhook_url) {
        webhookUrl = user.webhook_url;
      } else {
        return NextResponse.json({ error: 'No webhook URL provided or configured in settings' }, { status: 400 });
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leads,
          exportedAt: new Date().toISOString(),
          exportedBy: session.email,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return NextResponse.json({
        success: response.ok,
        statusCode: response.status,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ error: 'Webhook request timed out' }, { status: 504 });
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Export webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
