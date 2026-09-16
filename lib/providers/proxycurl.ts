import { Contact } from '@/lib/types';

const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY;

export async function enrichLinkedIn(linkedinUrl: string): Promise<Partial<Contact>> {
  if (!PROXYCURL_API_KEY) {
    return mockEnrichLinkedIn(linkedinUrl);
  }

  try {
    const url = new URL('https://nubela.co/proxycurl/api/v2/linkedin');
    url.searchParams.append('url', linkedinUrl);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Proxycurl API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      first_name: data.first_name,
      last_name: data.last_name,
      title: data.occupation,
      linkedin_url: linkedinUrl,
    };
  } catch (error) {
    console.error('Proxycurl linkedin enrichment failed:', error);
    return {};
  }
}

export async function lookupMobilePhone(linkedinUrl: string): Promise<{ mobile_phone?: string }> {
  if (!PROXYCURL_API_KEY) {
    return mockLookupMobilePhone(linkedinUrl);
  }

  try {
    const url = new URL('https://nubela.co/proxycurl/api/contact-api/personal-contact');
    url.searchParams.append('linkedin_profile_url', linkedinUrl);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Proxycurl contact API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      mobile_phone: data.numbers && data.numbers.length > 0 ? data.numbers[0] : undefined,
    };
  } catch (error) {
    console.error('Proxycurl mobile lookup failed:', error);
    return {};
  }
}

async function mockEnrichLinkedIn(linkedinUrl: string) {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  return {
    first_name: 'Mock',
    last_name: 'User',
    title: 'Executive',
    linkedin_url: linkedinUrl,
  };
}

async function mockLookupMobilePhone(linkedinUrl: string) {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  const prefix = ['+1', '+44', '+61'][Math.floor(Math.random() * 3)];
  const body = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return { mobile_phone: `${prefix}${body}` };
}
