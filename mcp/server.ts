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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('EnrichAgent MCP Server running on stdio');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
