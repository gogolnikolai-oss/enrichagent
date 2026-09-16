import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { d1, UserRecord } from '@/lib/d1';
import { initializeCredits } from '@/lib/services/credits';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      // Mock acknowledge for dev
      return NextResponse.json({ received: true, mock: true });
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Stripe Webhook Error: ${error.message}`);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const metadata = session.metadata;
        const userId = metadata?.userId;

        if (!userId) break;

        if (session.mode === 'payment') {
          const credits = parseInt(metadata?.credits || '0', 10);
          if (credits > 0) {
            await d1
              .prepare(
                `UPDATE users
                 SET credits_balance = credits_balance + ?, updated_at = datetime('now')
                 WHERE id = ?`
              )
              .bind(credits, userId)
              .run();

            const user = await d1
              .prepare('SELECT credits_balance FROM users WHERE id = ?')
              .bind(userId)
              .first<UserRecord>();

            if (user) {
              await initializeCredits(userId, user.credits_balance);
            }
          }
        } else if (session.mode === 'subscription') {
          await d1
            .prepare(
              `UPDATE users
               SET tier = 'pro', updated_at = datetime('now')
               WHERE id = ?`
            )
            .bind(userId)
            .run();
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (userId && subscription.status === 'active') {
          await d1
            .prepare(
              `UPDATE users
               SET tier = 'pro', updated_at = datetime('now')
               WHERE id = ?`
            )
            .bind(userId)
            .run();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await d1
            .prepare(
              `UPDATE users
               SET tier = 'free', updated_at = datetime('now')
               WHERE id = ?`
            )
            .bind(userId)
            .run();
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type ${event.type}`);
    }
  } catch (err: any) {
    console.error('Stripe webhook handler failed:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
