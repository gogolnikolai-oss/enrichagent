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
