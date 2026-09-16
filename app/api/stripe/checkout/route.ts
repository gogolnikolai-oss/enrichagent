import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, priceId, packSize } = body as { type: 'subscription' | 'credits'; priceId?: string; packSize?: number };

    if (type !== 'subscription' && type !== 'credits') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    let finalPriceId = priceId;
    let credits = 0;

    if (type === 'credits') {
      if (!packSize) {
        return NextResponse.json({ error: 'packSize is required for credits' }, { status: 400 });
      }
      credits = Number(packSize);

      switch (credits) {
        case 250:
          finalPriceId = process.env.STRIPE_PRICE_CREDITS_250 || 'price_credits_250';
          break;
        case 1000:
          finalPriceId = process.env.STRIPE_PRICE_CREDITS_1000 || 'price_credits_1000';
          break;
        case 3000:
          finalPriceId = process.env.STRIPE_PRICE_CREDITS_3000 || 'price_credits_3000';
          break;
        case 10000:
          finalPriceId = process.env.STRIPE_PRICE_CREDITS_10000 || 'price_credits_10000';
          break;
        default:
          finalPriceId = `price_credits_${credits}`;
          break;
      }
    } else {
      finalPriceId = priceId || process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly';
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!stripe || !finalPriceId) {
      console.warn('⚠️ Stripe is running in simulated mock mode (no key/price configured).');
      return NextResponse.json({
        url: `${origin}/dashboard/billing?success=true&mock=true&type=${type}&credits=${credits}`,
      });
    }

    const sessionConfig: any = {
      mode: type === 'subscription' ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      metadata: {
        userId: session.userId,
        type,
        credits: String(credits),
      },
    };

    if (type === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          userId: session.userId,
          type,
        },
      };
    } else {
      sessionConfig.payment_intent_data = {
        metadata: {
          userId: session.userId,
          type,
          credits: String(credits),
        },
      };
    }

    const stripeSession = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: stripeSession.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
