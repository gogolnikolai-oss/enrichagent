#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'enrichagent-mcp',
  version: '1.0.0'
});

const getBaseUrl = () => process.env.ENRICH_AGENT_API_URL || 'http://localhost:3000';
const getApiKey = () => {
  const key = process.env.ENRICH_AGENT_API_KEY;
  if (!key) {
    throw new Error('ENRICH_AGENT_API_KEY environment variable is required');
  }
  return key;
};

// Tool 1: enrich_lead
server.tool(
  'enrich_lead',
  'Search for and enrich a business lead by company domain and job title. Returns contact information including email, phone, and company data.',
  {
    domain: z.string().describe("Company domain (e.g., 'acme.com')"),
    title: z.string().optional().describe("Target job title (e.g., 'CEO', 'VP Sales')"),
    requireMobile: z.boolean().default(false).describe("Whether to include direct mobile phone number (costs 3 extra credits)")
  },
  async ({ domain, title, requireMobile }) => {
    try {
      const apiKey = getApiKey();
      const baseUrl = getBaseUrl();
      
      const response = await fetch(`${baseUrl}/api/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ domain, title, requireMobile })
      });

      if (!response.ok) {
        throw new Error(`Enrichment failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      console.error('Error in enrich_lead:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool 2: search_company
server.tool(
  'search_company',
  'Look up company information by domain. Returns employee count, valuation, industry, and address.',
  {
    domain: z.string().describe("Company domain to look up")
  },
  async ({ domain }) => {
    try {
      const apiKey = getApiKey();
      const baseUrl = getBaseUrl();
      
      const response = await fetch(`${baseUrl}/api/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ domain, includeCompanyData: true })
      });

      if (!response.ok) {
        throw new Error(`Company search failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      console.error('Error in search_company:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool 3: search_local_business (Google Maps & Area/Pincode)
server.tool(
  'search_local_business',
  'Search for local SMB businesses by category, city, area, or postal pincode worldwide. Returns phone numbers, websites, ratings, and Google Maps listings.',
  {
    category: z.string().describe("Business category or trade (e.g., 'Dentists', 'Real Estate', 'Restaurants', 'HVAC')"),
    city: z.string().optional().describe("City name (e.g., 'Austin', 'Miami', 'London')"),
    pincode: z.string().optional().describe("Postal pincode or ZIP code (e.g., '78701', '10012', '560038')"),
    country: z.string().default('US').describe("Country code (e.g., 'US', 'CA', 'UK', 'IN')")
  },
  async ({ category, city, pincode, country }) => {
    try {
      const apiKey = getApiKey();
      const baseUrl = getBaseUrl();

      const response = await fetch(`${baseUrl}/api/local-businesses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ category, city, areaOrPincode: pincode, country })
      });

      if (!response.ok) {
        throw new Error(`Local business search failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      console.error('Error in search_local_business:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool 4: search_new_startups (SEC EDGAR Form D Venture Funding)
server.tool(
  'search_new_startups',
  'Query newly funded startups and venture capital rounds from the last 6 months (powered by SEC EDGAR Form D and tech directories). Returns funding round, amount, founders, investors, and filing links.',
  {
    timeWindowMonths: z.number().default(6).describe("How many months back to search (e.g., 1, 3, 6, 12). Default is 6."),
    round: z.string().optional().describe("Funding stage: 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Venture'"),
    industry: z.string().optional().describe("Industry or sector (e.g., 'AI', 'FinTech', 'BioTech', 'Robotics')"),
    minFunding: z.number().optional().describe("Minimum funding amount in USD (e.g., 1000000 for $1M+)")
  },
  async ({ timeWindowMonths, round, industry, minFunding }) => {
    try {
      const apiKey = getApiKey();
      const baseUrl = getBaseUrl();

      const response = await fetch(`${baseUrl}/api/startups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ timeWindowMonths, round, industry, minFunding })
      });

      if (!response.ok) {
        throw new Error(`Startups search failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      console.error('Error in search_new_startups:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool 5: search_property_owners (Property, Chalet, Cottage & Condo Owners)
server.tool(
  'search_property_owners',
  'Find property, luxury chalet, cottage, and condo owners by city, area, or zipcode. Returns owner name, verified mobile number, direct dial, email address, property name, and street address using county parcel data and skip tracing.',
  {
    propertyType: z.enum(['all', 'chalet', 'cottage', 'condo', 'residential', 'vacation_rental']).default('all').describe("Property category: 'chalet', 'cottage', 'condo', 'residential', 'vacation_rental', or 'all'"),
    city: z.string().optional().describe("City or municipality (e.g., 'Aspen', 'Miami', 'Lake Tahoe')"),
    areaOrZipcode: z.string().optional().describe("Area, zipcode or postal code (e.g., '81611', '33139')"),
    country: z.string().default("United States").describe("Country name (e.g., 'United States', 'Canada', 'France')"),
    requireMobile: z.boolean().default(false).describe("Only return leads with verified mobile phone numbers"),
    requireEmail: z.boolean().default(false).describe("Only return leads with verified email addresses"),
    limit: z.number().default(15).describe("Maximum number of property owners to return (default 15)")
  },
  async ({ propertyType, city, areaOrZipcode, country, requireMobile, requireEmail, limit }) => {
    try {
      const apiKey = getApiKey();
      const baseUrl = getBaseUrl();

      const response = await fetch(`${baseUrl}/api/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ propertyType, city, areaOrZipcode, country, requireMobile, requireEmail, limit })
      });

      if (!response.ok) {
        throw new Error(`Property owners search failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      console.error('Error in search_property_owners:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('EnrichAgent MCP Server running on stdio');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
