-- Add paypal_subscription_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- Index for PayPal subscription lookups
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id 
ON profiles(paypal_subscription_id);
