/**
 * PayPal REST API v2 & Subscriptions v1 Client
 * EnrichAgent SaaS
 */

const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Checks if PayPal credentials are configured
 */
export function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

/**
 * Retrieves an OAuth 2.0 Access Token from PayPal with in-memory caching.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60 * 1000) {
    return cachedAccessToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal credentials in environment variables');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to authenticate with PayPal: ${errorText}`);
  }

  const data = await response.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
  };

  return data.access_token;
}

export interface CreateOrderParams {
  amount: string;
  currency?: string;
  customId?: string; // e.g. JSON.stringify({ userId, credits, packSize })
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}

/**
 * Creates an order using PayPal Orders REST API v2
 */
export async function createPayPalOrder({
  amount,
  currency = 'USD',
  customId,
  description = 'EnrichAgent Credits',
  returnUrl,
  cancelUrl,
}: CreateOrderParams): Promise<{ id: string; approvalUrl: string }> {
  // Mock mode for local development without credentials
  if (!isPayPalConfigured()) {
    console.warn('⚠️ PayPal credentials missing. Using simulated mock order.');
    const mockOrderId = `MOCK-PAYPAL-${Date.now()}`;
    const approvalUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}mock_paypal=true&token=${mockOrderId}&custom_id=${encodeURIComponent(customId || '')}`;
    return { id: mockOrderId, approvalUrl };
  }

  const accessToken = await getPayPalAccessToken();

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        custom_id: customId,
        description,
        amount: {
          currency_code: currency,
          value: amount,
        },
      },
    ],
    application_context: {
      brand_name: 'EnrichAgent',
      user_action: 'PAY_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl,
      shipping_preference: 'NO_SHIPPING',
    },
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal Create Order Error: ${error}`);
  }

  const order = await response.json();
  const approveLink = order.links?.find((l: any) => l.rel === 'approve');

  if (!approveLink?.href) {
    throw new Error('PayPal did not return an approval link');
  }

  return {
    id: order.id,
    approvalUrl: approveLink.href,
  };
}

/**
 * Captures an approved PayPal order
 */
export async function capturePayPalOrder(orderId: string): Promise<any> {
  // Mock capture for local testing
  if (orderId.startsWith('MOCK-PAYPAL-') || !isPayPalConfigured()) {
    return {
      id: orderId,
      status: 'COMPLETED',
      mock: true,
    };
  }

  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `capture-${orderId}`,
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal Capture Order Error: ${error}`);
  }

  return response.json();
}

export interface CreateSubscriptionParams {
  planId?: string;
  customId?: string;
  returnUrl: string;
  cancelUrl: string;
}

/**
 * Creates a subscription agreement using PayPal Subscriptions API v1
 */
export async function createPayPalSubscription({
  planId,
  customId,
  returnUrl,
  cancelUrl,
}: CreateSubscriptionParams): Promise<{ id: string; approvalUrl: string }> {
  const activePlanId = planId || process.env.PAYPAL_PLAN_ID_PRO;

  // Mock mode fallback
  if (!isPayPalConfigured() || !activePlanId) {
    console.warn('⚠️ PayPal credentials or PAYPAL_PLAN_ID_PRO missing. Using simulated mock subscription.');
    const mockSubId = `MOCK-SUB-${Date.now()}`;
    const approvalUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}mock_paypal_sub=true&subscription_id=${mockSubId}&custom_id=${encodeURIComponent(customId || '')}`;
    return { id: mockSubId, approvalUrl };
  }

  const accessToken = await getPayPalAccessToken();

  const payload = {
    plan_id: activePlanId,
    custom_id: customId,
    application_context: {
      brand_name: 'EnrichAgent',
      user_action: 'SUBSCRIBE_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl,
      shipping_preference: 'NO_SHIPPING',
    },
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal Create Subscription Error: ${error}`);
  }

  const sub = await response.json();
  const approveLink = sub.links?.find((l: any) => l.rel === 'approve');

  if (!approveLink?.href) {
    throw new Error('PayPal did not return an approval link for the subscription');
  }

  return {
    id: sub.id,
    approvalUrl: approveLink.href,
  };
}

export interface VerifyWebhookParams {
  headers: Headers;
  rawBody: string;
}

/**
 * Verifies PayPal webhook signature authenticity
 */
export async function verifyPayPalWebhookSignature({
  headers,
  rawBody,
}: VerifyWebhookParams): Promise<boolean> {
  if (!isPayPalConfigured() || !process.env.PAYPAL_WEBHOOK_ID) {
    // If not configured, bypass for mock/dev
    return true;
  }

  try {
    const accessToken = await getPayPalAccessToken();

    const authAlgo = headers.get('paypal-auth-algo');
    const certUrl = headers.get('paypal-cert-url');
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionSig = headers.get('paypal-transmission-sig');
    const transmissionTime = headers.get('paypal-transmission-time');
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      console.error('Missing required PayPal webhook signature headers');
      return false;
    }

    const payload = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    };

    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('PayPal webhook verification failed:', err);
    return false;
  }
}
