-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    credits_balance INT NOT NULL DEFAULT 25,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    webhook_url TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    domain TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    employee_count INT,
    valuation_usd BIGINT,
    address JSONB,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_domain TEXT REFERENCES public.companies(domain) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    title TEXT,
    email TEXT UNIQUE,
    mobile_phone TEXT,
    direct_dial TEXT,
    linkedin_url TEXT,
    source TEXT DEFAULT 'waterfall',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_saved_leads table
CREATE TABLE IF NOT EXISTS public.user_saved_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, contact_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_company_domain ON public.contacts(company_domain);
CREATE INDEX IF NOT EXISTS idx_contacts_title ON public.contacts(title);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON public.companies(domain);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_leads ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- User Saved Leads RLS policies
CREATE POLICY "Users can view own saved leads"
    ON public.user_saved_leads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved leads"
    ON public.user_saved_leads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved leads"
    ON public.user_saved_leads FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to create a profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grants
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated;
