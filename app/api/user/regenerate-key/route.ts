import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { d1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const newApiKey = `ea_${crypto.randomUUID().replace(/-/g, '')}`;

    await d1
      .prepare('UPDATE users SET api_key = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(newApiKey, session.userId)
      .run();

    return NextResponse.json({ success: true, apiKey: newApiKey });
  } catch (error: any) {
    console.error('Error regenerating API key:', error);
    return NextResponse.json({ error: error.message || 'Failed to regenerate API key' }, { status: 500 });
  }
}
