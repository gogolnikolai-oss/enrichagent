import { Contact, Company } from '@/lib/types';

const DATAGMA_API_KEY = process.env.DATAGMA_API_KEY;

export async function enrichContact(domain: string, title?: string): Promise<{ contacts: Contact[], company?: Partial<Company> }> {
  if (!DATAGMA_API_KEY) {
    return mockEnrichContact(domain, title);
  }

  try {
    const url = new URL('https://gateway.datagma.net/api/ingress/v3/full');
    url.searchParams.append('domain', domain);
    if (title) {
      url.searchParams.append('title', title);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': DATAGMA_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Datagma API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map Datagma response to our internal types
    // This is a simplified mapping assuming a specific Datagma payload structure
    const contacts: Contact[] = (data.contacts || []).map((c: any) => {
      const firstName = c.firstName || '';
      const lastName = c.lastName || '';
      return {
        id: crypto.randomUUID(),
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        title: c.title || '',
        email: c.email || '',
        mobile_phone: c.phone || null,
        direct_dial: c.directDial || null,
        linkedin_url: c.linkedinUrl || '',
        company_domain: domain,
        source: 'datagma',
      };
    });

    return { contacts };
  } catch (error) {
    console.error('Datagma enrichment failed:', error);
    return { contacts: [] };
  }
}

async function mockEnrichContact(domain: string, title?: string) {
  // Simulate latency
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  const mockNames = [
    { first: 'Jane', last: 'Doe' },
    { first: 'John', last: 'Smith' },
    { first: 'Emily', last: 'Johnson' }
  ];
  
  const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
  const jobTitle = title || 'Software Engineer';
  
  const contact: Contact = {
    id: crypto.randomUUID(),
    first_name: randomName.first,
    last_name: randomName.last,
    full_name: `${randomName.first} ${randomName.last}`,
    title: jobTitle,
    email: `${randomName.first.toLowerCase()}.${randomName.last.toLowerCase()}@${domain}`,
    mobile_phone: null,
    direct_dial: null,
    linkedin_url: `https://linkedin.com/in/${randomName.first.toLowerCase()}-${randomName.last.toLowerCase()}`,
    company_domain: domain,
    source: 'waterfall',
  };

  return { contacts: [contact] };
}
