import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { d1, UserRecord } from '@/lib/d1';
import { capturePayPalOrder } from '@/lib/paypal';
import { initializeCredits } from '@/lib/services/credits';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, credits } = body as { orderId: string; credits?: number };

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const captureResult = await capturePayPalOrder(orderId);

    let creditsToAdd = Number(credits) || 0;

    if (!creditsToAdd && captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id) {
      try {
        const parsed = JSON.parse(captureResult.purchase_units[0].payments.captures[0].custom_id);
        if (parsed.credits) creditsToAdd = Number(parsed.credits);
      } catch (e) {
        // ignore JSON parse error
      }
    }

    if (creditsToAdd <= 0) {
      creditsToAdd = 500;
    }

    // Atomic credit increment in Cloudflare D1
    await d1
      .prepare(
        `UPDATE users
         SET credits_balance = credits_balance + ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(creditsToAdd, session.userId)
      .run();

    const user = await d1
      .prepare('SELECT credits_balance FROM users WHERE id = ?')
      .bind(session.userId)
      .first<UserRecord>();

    const newBalance = user?.credits_balance ?? creditsToAdd;
    await initializeCredits(session.userId, newBalance);

    return NextResponse.json({
      success: true,
      creditsAdded: creditsToAdd,
      newBalance,
      orderId,
    });
  } catch (error: any) {
    console.error('PayPal capture-order error:', error);
    return NextResponse.json({ error: error.message || 'Failed to capture PayPal order' }, { status: 500 });
  }
}
