"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap, CreditCard, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface CreditPack {
  credits: number;
  price: number;
  label?: string;
  name?: string;
}

interface BillingCardsProps {
  creditPacks: CreditPack[];
}

export function BillingCards({ creditPacks }: BillingCardsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleStripeCheckout = async (packCredits: number) => {
    const actionKey = `stripe-${packCredits}`;
    setLoadingId(actionKey);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credits", packSize: packCredits }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe checkout session");
      }

      if (data.url) {
        router.push(data.url);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      toast.error(error.message || "Failed to start card checkout. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePayPalCheckout = async (packCredits: number) => {
    const actionKey = `paypal-${packCredits}`;
    setLoadingId(actionKey);
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packSize: packCredits }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create PayPal order");
      }

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error("No PayPal approval link returned");
      }
    } catch (error: any) {
      console.error("PayPal checkout error:", error);
      toast.error(error.message || "Failed to start PayPal checkout. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {creditPacks.map((pack, index) => {
        const isMiddle = index === 1;
        const packName = pack.label || pack.name || `${pack.credits.toLocaleString()} Credits`;
        const isStripeLoading = loadingId === `stripe-${pack.credits}`;
        const isPayPalLoading = loadingId === `paypal-${pack.credits}`;
        const isAnyLoading = loadingId !== null;

        return (
          <Card 
            key={pack.credits} 
            className={cn(
              "relative flex flex-col transition-all duration-200 hover:shadow-md",
              isMiddle && "border-primary shadow-sm ring-1 ring-primary/20"
            )}
          >
            {isMiddle && (
              <div className="absolute -top-3 left-0 right-0 flex justify-center">
                <Badge className="bg-primary text-primary-foreground font-semibold flex items-center gap-1 shadow-sm">
                  <Zap className="h-3 w-3" /> Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pt-8 pb-4">
              <CardTitle className="text-xl">{packName}</CardTitle>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Coins className={cn("h-8 w-8", isMiddle ? "text-primary" : "text-muted-foreground")} />
                <span className="text-4xl font-bold tracking-tighter">
                  {pack.credits.toLocaleString()}
                </span>
              </div>
              <CardDescription className="mt-2 font-medium">Credits</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 text-center">
              <div className="text-3xl font-bold mb-1">${pack.price}</div>
              <div className="text-sm text-muted-foreground">
                ${(pack.price / pack.credits).toFixed(4)} per credit
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button 
                className="w-full" 
                variant={isMiddle ? "default" : "secondary"}
                size="default"
                onClick={() => handleStripeCheckout(pack.credits)}
                disabled={isAnyLoading}
              >
                {isStripeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay with Card
                  </>
                )}
              </Button>

              <Button 
                className="w-full border-blue-600/30 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-400" 
                variant="outline"
                size="default"
                onClick={() => handlePayPalCheckout(pack.credits)}
                disabled={isAnyLoading}
              >
                {isPayPalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="font-semibold italic mr-1 text-blue-600 dark:text-blue-400">P</span>
                    Pay with PayPal
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
