import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { createPayPalOrder } from '@/lib/paypal';
import { CREDIT_PACKS } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { packSize } = body as { packSize: number };

    const pack = CREDIT_PACKS.find(p => p.credits === Number(packSize));
    if (!pack) {
      return NextResponse.json({ error: 'Invalid credit pack size' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${origin}/dashboard/billing?paypal_order_success=true&credits=${pack.credits}`;
    const cancelUrl = `${origin}/dashboard/billing?paypal_cancel=true`;

    const customId = JSON.stringify({
      userId: session.userId,
      credits: pack.credits,
      packPrice: pack.price,
      type: 'credits',
    });

    const { id, approvalUrl } = await createPayPalOrder({
      amount: pack.price.toFixed(2),
      currency: 'USD',
      customId,
      description: `EnrichAgent — ${pack.label} (${pack.credits.toLocaleString()} Credits)`,
      returnUrl,
      cancelUrl,
    });

    return NextResponse.json({ id, approvalUrl });
  } catch (error: any) {
    console.error('PayPal create-order error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create PayPal order' }, { status: 500 });
  }
}
