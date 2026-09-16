import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY is missing. Stripe features will fail.');
}

// Initialize Stripe instance
export const stripe = new Stripe(stripeSecretKey || 'sk_test_mock', {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

/**
 * Gets an existing Stripe customer by email, or creates a new one.
 */
export async function getOrCreateStripeCustomer(email: string, userId: string): Promise<string> {
  if (!stripeSecretKey) {
    console.warn('Mocking Stripe customer creation for', email);
    return `cus_mock_${userId}`;
  }

  // Look for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  return customer.id;
}
