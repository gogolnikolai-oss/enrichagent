"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

function StatusListenerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const paypalOrderSuccess = searchParams.get("paypal_order_success");
    const paypalSubSuccess = searchParams.get("paypal_sub_success");
    const paypalCancel = searchParams.get("paypal_cancel");
    const stripeSuccess = searchParams.get("success");
    const token = searchParams.get("token");
    const credits = searchParams.get("credits");

    if (paypalOrderSuccess && token) {
      processedRef.current = true;
      toast.loading("Finalizing your PayPal purchase...", { id: "paypal-capture" });

      fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: token,
          credits: credits ? Number(credits) : 500,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Capture failed");
          toast.success(`Success! Added ${data.creditsAdded || credits || 500} credits to your account.`, {
            id: "paypal-capture",
          });
          router.replace("/dashboard/billing");
          router.refresh();
        })
        .catch((err) => {
          console.error("PayPal capture error:", err);
          toast.error(err.message || "Failed to finalize PayPal order", { id: "paypal-capture" });
        });
    } else if (paypalSubSuccess) {
      processedRef.current = true;
      toast.success("PayPal subscription activated! Your account is upgraded to Pro.", {
        duration: 5000,
      });
      router.replace("/dashboard/billing");
      router.refresh();
    } else if (paypalCancel) {
      processedRef.current = true;
      toast.info("PayPal checkout was cancelled.", { duration: 4000 });
      router.replace("/dashboard/billing");
    } else if (stripeSuccess) {
      processedRef.current = true;
      toast.success("Payment completed successfully!", { duration: 4000 });
      router.replace("/dashboard/billing");
      router.refresh();
    }
  }, [searchParams, router]);

  return null;
}

export function BillingStatusListener() {
  return (
    <Suspense fallback={null}>
      <StatusListenerInner />
    </Suspense>
  );
}
