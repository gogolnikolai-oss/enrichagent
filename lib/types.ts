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

// --- Local Business / Google Maps Types ---
export interface LocalBusiness {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  area_pincode: string;
  country: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews_count: number | null;
  google_maps_url: string | null;
  source: 'google_maps' | 'dataforseo' | 'osm' | 'data_lake';
  created_at?: string;
}

export interface LocalSearchRequest {
  category: string;
  city?: string;
  areaOrPincode?: string;
  country?: string;
  requirePhone?: boolean;
  requireWebsite?: boolean;
  minRating?: number;
}

// --- Startups & Funding Intelligence Types ---
export interface StartupFunding {
  id: string;
  name: string;
  domain: string | null;
  industry: string;
  city: string;
  state: string | null;
  country: string;
  funding_date: string; // ISO date
  funding_round: 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Venture' | 'Grant';
  funding_amount_usd: number;
  investors: string[];
  founders: string[];
  sec_filing_url: string | null;
  description: string;
  source: 'sec_edgar' | 'yc_directory' | 'hn_startups' | 'data_lake';
  created_at?: string;
}

export interface StartupSearchRequest {
  timeWindowMonths?: number; // default 6 (last 6 months)
  round?: string;
  minFunding?: number;
  industry?: string;
  country?: string;
}

// --- Custom User Provider Keys & MCP Connectors ---
export interface UserProviderConfig {
  id: string;
  userId: string;
  provider: 'google_maps' | 'dataforseo' | 'hunter' | 'skip_trace' | 'custom_mcp';
  apiKey?: string;
  mcpEndpoint?: string;
  enabled: boolean;
}

// --- Property, Chalet, Cottage & Condo Owners Types ---
export type PropertyType = 'all' | 'chalet' | 'cottage' | 'condo' | 'residential' | 'vacation_rental';

export interface PropertyLead {
  id: string;
  property_name: string;
  property_type: PropertyType;
  address: string;
  unit: string | null;
  city: string;
  area_zipcode: string;
  state: string | null;
  country: string;
  owner_name: string;
  owner_type: 'individual' | 'corporate';
  mobile_phone: string | null;
  direct_dial_phone: string | null;
  email: string | null;
  mailing_address: string | null;
  estimated_value_usd: number | null;
  source: 'google_places' | 'osm_overpass' | 'county_gis' | 'skip_trace' | 'data_lake';
  created_at?: string;
  updated_at?: string;
}

export interface PropertySearchRequest {
  propertyType: PropertyType;
  city?: string;
  areaOrZipcode?: string;
  country?: string;
  requireMobile?: boolean;
  requireEmail?: boolean;
  limit?: number;
}
