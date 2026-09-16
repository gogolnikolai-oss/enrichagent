-- Cloudflare D1 SQLite Schema for EnrichAgent

-- Users & Profiles Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- NULL for OAuth-only users
  api_key TEXT UNIQUE NOT NULL,
  credits_balance INTEGER NOT NULL DEFAULT 25,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  webhook_url TEXT,
  stripe_customer_id TEXT,
  paypal_subscription_id TEXT,
  google_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Persistent Companies Data Lake
CREATE TABLE IF NOT EXISTS companies (
  domain TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  employee_count INTEGER,
  valuation_usd INTEGER,
  address TEXT, -- JSON string
  linkedin_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Persistent Contacts / Leads Data Lake
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  company_domain TEXT REFERENCES companies(domain) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  title TEXT,
  email TEXT UNIQUE,
  mobile_phone TEXT,
  direct_dial TEXT,
  linkedin_url TEXT,
  source TEXT DEFAULT 'waterfall',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User Saved Leads Table
CREATE TABLE IF NOT EXISTS user_saved_leads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, contact_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_contacts_domain_title ON contacts(company_domain, title);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_saved_leads_user ON user_saved_leads(user_id);

-- Local Businesses Data Lake (Google Maps / SMBs)
CREATE TABLE IF NOT EXISTS local_businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  area_pincode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  phone TEXT,
  website TEXT,
  rating REAL,
  reviews_count INTEGER,
  google_maps_url TEXT,
  source TEXT DEFAULT 'google_maps',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Startups & Funding Intelligence Data Lake (SEC Form D + YC/HN)
CREATE TABLE IF NOT EXISTS startups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  funding_date TEXT NOT NULL,
  funding_round TEXT NOT NULL,
  funding_amount_usd INTEGER NOT NULL,
  investors TEXT, -- JSON array string
  founders TEXT, -- JSON array string
  sec_filing_url TEXT,
  description TEXT,
  source TEXT DEFAULT 'sec_edgar',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Custom User Provider Keys & MCP Connectors
CREATE TABLE IF NOT EXISTS user_provider_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT,
  mcp_endpoint TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, provider)
);

-- Property, Chalet, Cottage & Condo Owners Data Lake
CREATE TABLE IF NOT EXISTS properties_leads (
  id TEXT PRIMARY KEY,
  property_name TEXT NOT NULL,
  property_type TEXT NOT NULL, -- 'chalet', 'cottage', 'condo', 'residential', 'vacation_rental'
  address TEXT NOT NULL,
  unit TEXT,
  city TEXT NOT NULL,
  area_zipcode TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'United States',
  owner_name TEXT NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'corporate'
  mobile_phone TEXT,
  direct_dial_phone TEXT,
  email TEXT,
  mailing_address TEXT,
  estimated_value_usd INTEGER,
  source TEXT DEFAULT 'google_places', -- 'google_places', 'osm_overpass', 'county_gis', 'skip_trace', 'data_lake'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_local_biz_loc ON local_businesses(city, category);
CREATE INDEX IF NOT EXISTS idx_local_biz_pincode ON local_businesses(area_pincode);
CREATE INDEX IF NOT EXISTS idx_startups_date ON startups(funding_date);
CREATE INDEX IF NOT EXISTS idx_startups_industry ON startups(industry);
CREATE INDEX IF NOT EXISTS idx_properties_loc ON properties_leads(city, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_zipcode ON properties_leads(area_zipcode);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties_leads(owner_name);
