"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SubscriptionPlan } from "@/lib/types";

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  currentTier: string;
}

export function SubscriptionCard({ plan, currentTier }: SubscriptionCardProps) {
  const [loadingType, setLoadingType] = useState<'stripe' | 'paypal' | null>(null);
  const router = useRouter();
  const isCurrentPlan = currentTier === 'pro';

  const handleStripeSubscribe = async () => {
    setLoadingType('stripe');
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_pro_monthly',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate Stripe subscription');
      }

      if (data.url) {
        router.push(data.url);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Stripe subscribe error:', err);
      toast.error(err.message || 'Failed to start Stripe subscription');
    } finally {
      setLoadingType(null);
    }
  };

  const handlePayPalSubscribe = async () => {
    setLoadingType('paypal');
    try {
      const response = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate PayPal subscription');
      }

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No PayPal subscription approval link returned');
      }
    } catch (err: any) {
      console.error('PayPal subscribe error:', err);
      toast.error(err.message || 'Failed to start PayPal subscription');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <Card className="border-primary/40 shadow-sm relative overflow-hidden bg-gradient-to-b from-card to-primary/[0.02]">
      <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="default" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Recurring Plan
          </Badge>
          {isCurrentPlan && (
            <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950/20">
              Your Current Plan
            </Badge>
          )}
        </div>
        <CardTitle className="text-2xl font-bold mt-2">{plan.name}</CardTitle>
        <CardDescription>Everything you need for sustained automated lead generation</CardDescription>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tight">${plan.price}</span>
          <span className="text-muted-foreground font-medium">/{plan.interval}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm font-semibold text-foreground uppercase tracking-wide">Included Features:</div>
        <ul className="space-y-2.5 text-sm">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button 
          className="w-full sm:w-1/2" 
          variant="default"
          onClick={handleStripeSubscribe}
          disabled={loadingType !== null || isCurrentPlan}
        >
          {loadingType === 'stripe' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscribe with Card
            </>
          )}
        </Button>

        <Button 
          className="w-full sm:w-1/2 border-blue-600/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-400" 
          variant="outline"
          onClick={handlePayPalSubscribe}
          disabled={loadingType !== null || isCurrentPlan}
        >
          {loadingType === 'paypal' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span className="font-semibold italic mr-1 text-blue-600 dark:text-blue-400">P</span>
              Subscribe with PayPal
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
