# EnrichAgent — AI-Powered Lead Enrichment SaaS

A production-ready B2B & SMB lead aggregation web application with an integrated Model Context Protocol (MCP) server. Search, enrich, view, and export business leads with a self-growing data lake, waterfall enrichment engine, and AI-agent integration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App (Frontend)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Search   │  │ Results  │  │ Settings │  │ Billing  │    │
│  │ Console   │  │  Table   │  │  & API   │  │ & Stripe │    │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────┘    │
│       │              │                                        │
│  ┌────▼──────────────▼──────────────────────────────────┐    │
│  │              API Routes (/api/enrich)                  │    │
│  └────┬─────────────────────────────────────────────────┘    │
└───────┼─────────────────────────────────────────────────────┘
        │
  ┌─────▼─────────────────────────────────────────────┐
  │          Waterfall Enrichment Engine                │
  │  ┌─────────┐    ┌─────────┐    ┌─────────┐       │
  │  │ Data    │───▶│ Datagma │───▶│Proxycurl│       │
  │  │ Lake    │    │  API    │    │  API    │       │
  │  │(Supa.) │    └─────────┘    └─────────┘       │
  │  └─────────┘         │                            │
  │       ▲              │     ┌─────────┐            │
  │       └──────────────┼────▶│  FMP    │            │
  │    (upsert results)  │     │  API    │            │
  │                      │     └─────────┘            │
  └──────────────────────┼────────────────────────────┘
                         │
  ┌──────────────────────▼────────────────────────────┐
  │              MCP Server (stdio)                    │
  │   Tools: enrich_lead, search_company               │
  │   ▶ Claude Desktop / Cursor / LLM Agents           │
  └───────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI |
| Database | Cloudflare D1 (Serverless Edge SQLite data lake) |
| Cache & Credits | Cloudflare KV (Edge caching, rate limiting, and credit ledger) |
| Auth | Native Edge Auth (Web Crypto PBKDF2 + jose signed JWT cookies + Google OAuth) |
| Payments | Stripe & PayPal (subscriptions + one-time credit packs) |
| AI Integration | Model Context Protocol (MCP) Server |
| Exports | SheetJS (XLSX/CSV), Webhooks (Zapier/Make/CRM) |

## Prerequisites

- **Node.js** 20+ and npm
- **Cloudflare** account (optional — runs locally with built-in SQLite fallback)
- **Stripe** and/or **PayPal** sandbox account (test mode)

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd enrichagent
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local` (or leave empty to use built-in local SQLite & mock mode):

| Variable | Where to get it |
|----------|----------------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers & Pages → Overview |
| `CLOUDFLARE_D1_DATABASE_ID` | Cloudflare Dashboard → D1 SQL Database |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens |
| `CLOUDFLARE_KV_NAMESPACE_ID` | Cloudflare Dashboard → Workers & Pages → KV |
| `AUTH_SECRET` | Any random 32+ character string for JWT signing |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys |
| `PAYPAL_CLIENT_ID` | PayPal Developer Dashboard → Apps & Credentials |

### 3. Set Up Cloudflare D1 Database

If deploying to Cloudflare or connecting remotely:

```bash
# 1. Create a D1 database with Wrangler
npx wrangler d1 create enrichagent-db

# 2. Execute schema migration
npx wrangler d1 execute enrichagent-db --file=./cloudflare/schema.sql
```

*(For local development without Cloudflare credentials, EnrichAgent automatically runs a built-in local SQLite engine with full offline support.)*

### 4. Set Up Stripe Products

Create the following in your Stripe Dashboard (or use the Stripe CLI):

1. **Credit Packs** (one-time prices):
   - 500 Credits — $19
   - 2,500 Credits — $79
   - 10,000 Credits — $249

2. **Pro Subscription** (recurring price):
   - Pro Monthly — your chosen price

Copy each Price ID (`price_xxx`) into your `.env.local`.

### 5. Set Up PayPal (Optional — Mock mode enabled by default)

EnrichAgent supports PayPal for both **one-time credit top-ups** and **recurring Pro subscriptions**:

1. Create a Sandbox App in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard).
2. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `.env.local`.
3. Set `PAYPAL_MODE=sandbox` (or `live` in production).
4. Create a Subscription Plan in PayPal and copy the Plan ID (`P-...`) to `PAYPAL_PLAN_ID_PRO`.
5. *(Optional)* Add your Webhook ID to `PAYPAL_WEBHOOK_ID` listening for `PAYMENT.CAPTURE.COMPLETED` and `BILLING.SUBSCRIPTION.*`.
6. **Note**: If credentials are not provided, EnrichAgent runs in simulated mock PayPal mode locally so you can test the full flow without credentials.

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Set Up Webhooks (Stripe & PayPal Local Testing)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## MCP Server — Claude Desktop / Cursor Integration

### Setup

The MCP server allows Claude Desktop, Cursor, or any MCP-compatible LLM agent to search and enrich leads directly.

1. **Get your API key** from the Settings page (`/dashboard/settings`)

2. **Add to Claude Desktop config** (`%APPDATA%\Claude\claude_desktop_config.json` on Windows, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "enrichagent": {
      "command": "npx",
      "args": ["-y", "tsx", "C:/path/to/enrichagent/mcp/server.ts"],
      "env": {
        "ENRICH_AGENT_API_KEY": "your-api-key-here",
        "ENRICH_AGENT_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

3. **Restart Claude Desktop** completely (quit from system tray)

### Available MCP Tools

| Tool | Description | Inputs |
|------|-------------|--------|
| `enrich_lead` | Search and enrich a business lead | `domain` (required), `title` (optional), `requireMobile` (boolean) |
| `search_company` | Look up company information | `domain` (required) |

### Example Usage in Claude

> "Find me the CEO's contact info at acme.com"
> "What's the employee count and valuation of stripe.com?"

## API Reference

### POST `/api/enrich`

Enrich a lead by company domain and job title.

**Headers:**
- `x-api-key: your-api-key` (or use Supabase session cookie)

**Body:**
```json
{
  "domain": "acme.com",
  "title": "CEO",
  "requireMobile": false,
  "includeCompanyData": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contact": {
      "first_name": "John",
      "last_name": "Doe",
      "title": "Chief Executive Officer",
      "email": "john@acme.com",
      "mobile_phone": "+1-555-0123",
      "linkedin_url": "https://linkedin.com/in/johndoe"
    },
    "company": {
      "domain": "acme.com",
      "name": "Acme Corp",
      "industry": "Technology",
      "employee_count": 500,
      "valuation_usd": 50000000
    },
    "source": "waterfall",
    "creditsUsed": 4,
    "cached": false
  },
  "creditsRemaining": 21
}
```

## Credit System

| Data Point | Credit Cost |
|-----------|-------------|
| Verified Work Email | 1 credit |
| Direct Mobile Phone | 3 credits |
| Company Size & Valuation | 1 credit |
| Office Address | Included |

- New accounts start with **25 free credits**
- Data lake hits (cached results) still cost credits but return instantly
- Failed enrichment attempts are **automatically refunded**
- Credits can be purchased as one-time packs or via Pro subscription

## Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── dashboard/                # Dashboard (search, settings, billing)
│   └── api/                      # API routes
├── components/                   # React components
│   └── ui/                       # Shadcn UI primitives
├── lib/                          # Core libraries
│   ├── supabase/                 # Supabase client utilities
│   ├── services/                 # Business logic (enrichment, credits, export)
│   └── providers/                # External API clients (Datagma, Proxycurl, FMP)
├── mcp/                          # MCP server (standalone)
└── supabase/migrations/          # Database migrations
```

## License

MIT
