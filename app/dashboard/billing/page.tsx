import { getCurrentSession } from "@/lib/auth/session";
import { d1, UserRecord } from "@/lib/d1";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, History } from "lucide-react";
import { BillingCards } from "@/components/billing-cards";
import { SubscriptionCard } from "@/components/subscription-card";
import { BillingStatusListener } from "@/components/billing-status-listener";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "@/lib/types";

export default async function BillingPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await d1
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(session.userId)
    .first<UserRecord>();

  if (!profile) {
    redirect("/login");
  }

  const rawTier = (profile.tier || "free").toLowerCase();
  const planDisplay = rawTier.charAt(0).toUpperCase() + rawTier.slice(1);
  const credits = profile.credits_balance ?? 0;
  const isPro = rawTier === "pro" || rawTier === "enterprise";

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto p-4 md:p-8 w-full">
      <BillingStatusListener />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Billing & Credits</h1>
          <p className="text-muted-foreground">
            Manage your subscription plan, credit packs, and payment methods (Card & PayPal).
          </p>
        </div>
        {profile.stripe_customer_id && (
          <form action="/api/stripe/create-portal" method="POST">
            <Button variant="outline" type="submit">Manage Stripe Subscription</Button>
          </form>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Available Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Coins className="h-10 w-10 text-primary" />
              <span className="text-5xl font-bold tracking-tighter">{credits.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Credits are deducted only for verified contact lookups and are refunded automatically on failure.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{planDisplay}</span>
                {isPro ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                ) : (
                  <Badge variant="secondary">Free Tier</Badge>
                )}
              </div>
              {profile.paypal_subscription_id && (
                <Badge variant="outline" className="text-blue-600 border-blue-600 dark:text-blue-400">
                  Billed via PayPal
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {isPro
                ? "You have full access to high-speed waterfall data lake lookups and MCP tools."
                : "Upgrade to Pro for 1,000 recurring monthly credits and priority waterfall speed."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plans Section */}
      <div className="flex flex-col gap-4 mt-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
          <p className="text-muted-foreground mt-1">
            Subscribe monthly via <strong>Credit Card (Stripe)</strong> or <strong>PayPal</strong>. Cancel anytime.
          </p>
        </div>
        <div className="grid md:grid-cols-1 gap-6 max-w-2xl">
          <SubscriptionCard plan={SUBSCRIPTION_PLANS[0]} currentTier={rawTier} />
        </div>
      </div>

      {/* Credit Top-Up Packs Section */}
      <div className="flex flex-col gap-4 mt-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Buy One-Time Credits</h2>
          <p className="text-muted-foreground mt-1 mb-4">
            Need more leads without a monthly commitment? Top up instantly via Card or PayPal. Credits never expire.
          </p>
        </div>
        <BillingCards creditPacks={[...CREDIT_PACKS] as any} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
          <CardDescription>Your recent purchases and credit usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            No recent transaction activity to display.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
