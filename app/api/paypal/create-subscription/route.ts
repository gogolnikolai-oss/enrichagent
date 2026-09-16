import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { createPayPalSubscription } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body.planId === 'byok_monthly' ? 'byok' : 'pro';

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${origin}/dashboard/billing?paypal_sub_success=true&plan=${plan}`;
    const cancelUrl = `${origin}/dashboard/billing?paypal_cancel=true`;

    const customId = JSON.stringify({
      userId: session.userId,
      plan,
      type: 'subscription',
    });

    const { id, approvalUrl } = await createPayPalSubscription({
      customId,
      returnUrl,
      cancelUrl,
    });

    return NextResponse.json({ id, approvalUrl });
  } catch (error: any) {
    console.error('PayPal create-subscription error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create PayPal subscription' }, { status: 500 });
  }
}
