import { Company } from '@/lib/types';

const FMP_API_KEY = process.env.FMP_API_KEY;

export async function getCompanyProfile(domain: string): Promise<Partial<Company> | null> {
  if (!FMP_API_KEY) {
    return mockGetCompanyProfile(domain);
  }

  try {
    // Note: FMP usually searches by ticker. If domain search isn't directly supported by /profile, 
    // a different FMP endpoint or mapping might be needed. We use search by ticker or name here.
    // For the sake of the prompt, assuming a custom FMP endpoint or we search by domain text.
    // A more realistic FMP flow involves mapping domain -> ticker.
    const url = new URL('https://financialmodelingprep.com/api/v3/profile');
    url.searchParams.append('apikey', FMP_API_KEY);
    // Assuming symbol is known or we have an endpoint that supports domain. Using domain as symbol for placeholder.
    const response = await fetch(`${url.toString()}/${domain}`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      const profile = data[0];
      return {
        domain: domain,
        name: profile.companyName,
        industry: profile.industry,
        employee_count: profile.fullTimeEmployees ? parseInt(profile.fullTimeEmployees, 10) : undefined,
      };
    }
    return null;
  } catch (error) {
    console.error('FMP profile lookup failed:', error);
    return null;
  }
}

export async function searchCompany(name: string): Promise<Partial<Company>[]> {
  if (!FMP_API_KEY) {
    return mockSearchCompany(name);
  }

  try {
    const url = new URL('https://financialmodelingprep.com/api/v3/search');
    url.searchParams.append('query', name);
    url.searchParams.append('apikey', FMP_API_KEY);
    
    const response = await fetch(url.toString());
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.map((item: any) => ({
      name: item.name,
      domain: item.symbol // Fallback, since FMP search returns symbol, not domain
    }));
  } catch (error) {
    console.error('FMP search failed:', error);
    return [];
  }
}

async function mockGetCompanyProfile(domain: string) {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  return {
    domain,
    name: `${domain.split('.')[0].toUpperCase()} Corp`,
    industry: ['Technology', 'Healthcare', 'Finance', 'Retail'][Math.floor(Math.random() * 4)],
    employee_count: Math.floor(10 + Math.random() * 50000),
  };
}

async function mockSearchCompany(name: string) {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  return [
    {
      name: `${name} Inc`,
      domain: `${name.toLowerCase().replace(/\s+/g, '')}.com`,
      industry: 'Technology',
      employee_count: Math.floor(10 + Math.random() * 50000),
    }
  ];
}
