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
    const { type, priceId, packSize } = body as { type: 'subscription' | 'credits'; priceId?: string; packSize?: 500 | 2500 | 10000 };

    if (type !== 'subscription' && type !== 'credits') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    let finalPriceId = priceId;
    let credits = 0;

    if (type === 'credits') {
      if (!packSize) {
        return NextResponse.json({ error: 'packSize is required for credits' }, { status: 400 });
      }
      credits = packSize;

      switch (packSize) {
        case 500:
          finalPriceId = process.env.STRIPE_PRICE_CREDITS_500;
          break;
        case 2500:
          finalPriceId = process.env.STRIPE_PRICE_CREDITS_2500;
          break;
        case 10000:
          finalPriceId = process.env.STRIPE_PRICE_CREDITS_10000;
          break;
        default:
          return NextResponse.json({ error: 'Invalid pack size' }, { status: 400 });
      }
    } else {
      finalPriceId = priceId || process.env.STRIPE_PRICE_PRO_MONTHLY;
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
