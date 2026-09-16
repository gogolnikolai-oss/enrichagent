import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { d1, UserRecord } from '@/lib/d1';
import { getCreditsBalance } from '@/lib/services/credits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const credits = await getCreditsBalance(session.userId);

  const user = await d1
    .prepare('SELECT id, email, api_key, tier, credits_balance, webhook_url FROM users WHERE id = ?')
    .bind(session.userId)
    .first<UserRecord>();

  return NextResponse.json({
    credits: credits ?? user?.credits_balance ?? 0,
    user,
  });
}
