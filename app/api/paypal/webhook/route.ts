import { NextRequest, NextResponse } from 'next/server';
import { verifyPayPalWebhookSignature } from '@/lib/paypal';
import { d1, UserRecord } from '@/lib/d1';
import { initializeCredits } from '@/lib/services/credits';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const isValid = await verifyPayPalWebhookSignature({
      headers: req.headers,
      rawBody,
    });

    if (!isValid) {
      console.error('❌ Invalid PayPal webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    console.log(`[PayPal Webhook] Received event: ${event.event_type}`);

    switch (event.event_type) {
      // 1. One-time Payment Captured
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const capture = event.resource;
        const customIdStr = capture.custom_id;

        if (customIdStr) {
          try {
            const parsed = JSON.parse(customIdStr);
            const { userId, credits } = parsed;

            if (userId && credits) {
              await d1
                .prepare(
                  `UPDATE users
                   SET credits_balance = credits_balance + ?, updated_at = datetime('now')
                   WHERE id = ?`
                )
                .bind(Number(credits), userId)
                .run();

              const user = await d1
                .prepare('SELECT credits_balance FROM users WHERE id = ?')
                .bind(userId)
                .first<UserRecord>();

              if (user) {
                await initializeCredits(userId, user.credits_balance);
              }
              console.log(`[PayPal] Added ${credits} credits to user ${userId}`);
            }
          } catch (e) {
            console.error('[PayPal] Error parsing custom_id in capture event:', e);
          }
        }
        break;
      }

      // 2. Subscription Agreement Activated
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subscription = event.resource;
        const customIdStr = subscription.custom_id;

        if (customIdStr) {
          try {
            const parsed = JSON.parse(customIdStr);
            const userId = parsed.userId || customIdStr;

            if (userId) {
              await d1
                .prepare(
                  `UPDATE users
                   SET tier = 'pro',
                       paypal_subscription_id = ?,
                       credits_balance = credits_balance + 1000,
                       updated_at = datetime('now')
                   WHERE id = ?`
                )
                .bind(subscription.id, userId)
                .run();

              const user = await d1
                .prepare('SELECT credits_balance FROM users WHERE id = ?')
                .bind(userId)
                .first<UserRecord>();

              if (user) {
                await initializeCredits(userId, user.credits_balance);
              }
              console.log(`[PayPal] Pro tier activated for user ${userId}`);
            }
          } catch (e) {
            console.error('[PayPal] Error handling subscription activation:', e);
          }
        }
        break;
      }

      // 3. Recurring Subscription Payment Processed
      case 'PAYMENT.SALE.COMPLETED': {
        const sale = event.resource;
        const subscriptionId = sale.billing_agreement_id;

        if (subscriptionId) {
          const user = await d1
            .prepare('SELECT id, credits_balance FROM users WHERE paypal_subscription_id = ?')
            .bind(subscriptionId)
            .first<UserRecord>();

          if (user) {
            await d1
              .prepare(
                `UPDATE users
                 SET credits_balance = credits_balance + 1000, updated_at = datetime('now')
                 WHERE id = ?`
              )
              .bind(user.id)
              .run();

            await initializeCredits(user.id, user.credits_balance + 1000);
            console.log(`[PayPal] Monthly 1000 credits renewed for user ${user.id}`);
          }
        }
        break;
      }

      // 4. Subscription Cancelled, Suspended, or Expired
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const subscription = event.resource;
        const subscriptionId = subscription.id;

        await d1
          .prepare(
            `UPDATE users
             SET tier = 'free', updated_at = datetime('now')
             WHERE paypal_subscription_id = ?`
          )
          .bind(subscriptionId)
          .run();

        console.log(`[PayPal] Subscription ${subscriptionId} ended; reverted to free tier.`);
        break;
      }

      default:
        console.log(`[PayPal] Unhandled event type: ${event.event_type}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 });
  }
}
