// Company data structure
export interface Company {
  domain: string;
  name: string;
  industry: string | null;
  employee_count: number | null;
  valuation_usd: number | null;
  address: Record<string, string> | null;
  linkedin_url: string | null;
}

// Contact data structure  
export interface Contact {
  id: string;
  company_domain: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  title: string | null;
  email: string | null;
  mobile_phone: string | null;
  direct_dial: string | null;
  linkedin_url: string | null;
  source: string;
}

// User profile
export interface Profile {
  id: string;
  email: string;
  api_key: string;
  credits_balance: number;
  tier: 'free' | 'pro' | 'enterprise';
  webhook_url: string | null;
  stripe_customer_id: string | null;
  paypal_subscription_id?: string | null;
}

// Enrichment request/response
export interface EnrichmentRequest {
  domain: string;
  title?: string;
  location?: string;
  requireMobile?: boolean;
  includeCompanyData?: boolean;
}

export interface EnrichmentResult {
  contact: Contact | null;
  company: Company | null;
  source: 'data_lake' | 'waterfall';
  creditsUsed: number;
  cached: boolean;
}

// Credit operations
export type CreditOperation = 'deduct' | 'refund' | 'purchase' | 'subscription';

export interface CreditTransaction {
  userId: string;
  amount: number;
  operation: CreditOperation;
  description: string;
  timestamp: Date;
}

// Search parameters for the UI
export interface SearchParams {
  domain: string;
  title: string;
  location?: string;
  mode: 'b2b' | 'smb';
  fields: {
    email: boolean;
    mobile: boolean;
    companyData: boolean;
  };
}

// Credit cost configuration
export const CREDIT_COSTS = {
  email: 1,
  mobile: 3,
  companyData: 1,
  base: 0,
} as const;

// Credit pack definitions
export const CREDIT_PACKS = [
  { credits: 500, price: 19, label: 'Starter Pack' },
  { credits: 2500, price: 79, label: 'Growth Pack' },
  { credits: 10000, price: 249, label: 'Scale Pack' },
] as const;

export interface CreditPack {
  credits: number;
  price: number;
  label: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  creditsMonthly: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pro_monthly',
    name: 'Pro Plan',
    price: 29,
    interval: 'month',
    creditsMonthly: 1000,
    features: [
      '1,000 monthly credits included',
      'Instant Data Lake lookups (0ms)',
      'Sequential waterfall fallback',
      'Direct mobile phone lookups',
      'Claude & Cursor MCP Server access',
      'CRM & Zapier Webhook integrations',
    ],
  },
];
