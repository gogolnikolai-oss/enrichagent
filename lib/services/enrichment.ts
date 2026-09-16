import { Contact, Company } from '@/lib/types';
import { d1 } from '@/lib/d1';
import { deductCredits, refundCredits } from '@/lib/services/credits';
import { enrichContact } from '@/lib/providers/datagma';
import { lookupMobilePhone } from '@/lib/providers/proxycurl';
import { getCompanyProfile } from '@/lib/providers/fmp';

export interface EnrichmentRequest {
  domain: string;
  title?: string;
  requireMobile?: boolean;
  includeCompanyData?: boolean;
}

export interface EnrichmentResult {
  contact?: Contact;
  company?: Partial<Company>;
  source: 'data_lake' | 'waterfall' | 'api' | 'none';
  cached: boolean;
  creditsUsed: number;
}

export async function enrichLead(request: EnrichmentRequest, userId: string): Promise<EnrichmentResult> {
  // 1. Calculate credit cost
  let creditCost = 0;
  creditCost += 1; // email cost
  if (request.requireMobile) creditCost += 3;
  if (request.includeCompanyData) creditCost += 1;

  // 2. Deduct credits atomically via D1 / KV
  const deductionResult = await deductCredits(userId, creditCost);
  if (!deductionResult.success) {
    throw new Error('Insufficient credits for enrichment');
  }

  try {
    // 3. Cloudflare D1 Persistent Data Lake Check for Contact
    let matchedContact: Contact | undefined = undefined;
    let fromCache = false;

    let sql = 'SELECT * FROM contacts WHERE company_domain = ?';
    const params: any[] = [request.domain];

    if (request.title) {
      sql += ' AND title LIKE ?';
      params.push(`%${request.title}%`);
    }

    sql += ' LIMIT 1';

    const cachedContact = await d1.prepare(sql).bind(...params).first<Contact>();

    if (cachedContact) {
      const hasRequiredMobile = request.requireMobile ? Boolean(cachedContact.mobile_phone) : true;
      if (cachedContact.email && hasRequiredMobile) {
        matchedContact = cachedContact;
        fromCache = true;
      }
    }

    // 4. Cloudflare D1 Persistent Data Lake Check for Company
    let matchedCompany: Partial<Company> | undefined = undefined;
    if (request.includeCompanyData) {
      const cachedCompany = await d1
        .prepare('SELECT * FROM companies WHERE domain = ?')
        .bind(request.domain)
        .first<any>();

      if (cachedCompany) {
        matchedCompany = {
          ...cachedCompany,
          address: typeof cachedCompany.address === 'string' ? JSON.parse(cachedCompany.address) : cachedCompany.address,
        };
      } else {
        const companyProfile = await getCompanyProfile(request.domain);
        if (companyProfile) {
          matchedCompany = companyProfile;
          await d1
            .prepare(
              `INSERT INTO companies (domain, name, industry, employee_count, valuation_usd, address, linkedin_url, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
               ON CONFLICT(domain) DO UPDATE SET
                 name = excluded.name,
                 industry = excluded.industry,
                 employee_count = excluded.employee_count,
                 valuation_usd = excluded.valuation_usd,
                 address = excluded.address,
                 linkedin_url = excluded.linkedin_url,
                 updated_at = datetime('now')`
            )
            .bind(
              request.domain,
              companyProfile.name || request.domain,
              companyProfile.industry || null,
              companyProfile.employee_count || null,
              companyProfile.valuation_usd || null,
              companyProfile.address ? JSON.stringify(companyProfile.address) : null,
              companyProfile.linkedin_url || null
            )
            .run();
        }
      }
    }

    // 5. Contact Waterfall if not in Data Lake
    if (!fromCache) {
      const datagmaResult = await enrichContact(request.domain, request.title);
      if (datagmaResult.contacts && datagmaResult.contacts.length > 0) {
        matchedContact = datagmaResult.contacts[0];

        if (request.requireMobile && !matchedContact.mobile_phone && matchedContact.linkedin_url) {
          const mobileResult = await lookupMobilePhone(matchedContact.linkedin_url);
          if (mobileResult.mobile_phone) {
            matchedContact.mobile_phone = mobileResult.mobile_phone;
          }
        }

        // 6. Upsert discovered contact into Cloudflare D1 Data Lake
        if (matchedContact) {
          await d1
            .prepare(
              `INSERT INTO contacts (id, company_domain, first_name, last_name, full_name, title, email, mobile_phone, direct_dial, linkedin_url, source, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
               ON CONFLICT(id) DO UPDATE SET
                 title = excluded.title,
                 email = excluded.email,
                 mobile_phone = excluded.mobile_phone,
                 direct_dial = excluded.direct_dial,
                 linkedin_url = excluded.linkedin_url,
                 updated_at = datetime('now')`
            )
            .bind(
              matchedContact.id,
              matchedContact.company_domain || request.domain,
              matchedContact.first_name,
              matchedContact.last_name,
              matchedContact.full_name || `${matchedContact.first_name} ${matchedContact.last_name}`.trim(),
              matchedContact.title || null,
              matchedContact.email || null,
              matchedContact.mobile_phone || null,
              matchedContact.direct_dial || null,
              matchedContact.linkedin_url || null,
              matchedContact.source || 'waterfall'
            )
            .run();
        }
      }
    }

    if (!matchedContact) {
      // 7. Refund on complete waterfall failure
      await refundCredits(userId, creditCost);
      return {
        source: 'none',
        cached: false,
        creditsUsed: 0,
      };
    }

    // 8. Return enriched result
    return {
      contact: matchedContact,
      company: matchedCompany,
      source: fromCache ? 'data_lake' : 'waterfall',
      cached: fromCache,
      creditsUsed: creditCost,
    };
  } catch (error) {
    // Attempt refund on unexpected error
    await refundCredits(userId, creditCost);
    throw error;
  }
}

export async function searchCompanyInfo(domain: string): Promise<Partial<Company> | null> {
  const cachedCompany = await d1
    .prepare('SELECT * FROM companies WHERE domain = ?')
    .bind(domain)
    .first<any>();

  if (cachedCompany) {
    return {
      ...cachedCompany,
      address: typeof cachedCompany.address === 'string' ? JSON.parse(cachedCompany.address) : cachedCompany.address,
    };
  }

  const companyProfile = await getCompanyProfile(domain);
  if (companyProfile) {
    await d1
      .prepare(
        `INSERT INTO companies (domain, name, industry, employee_count, valuation_usd, address, linkedin_url, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(domain) DO UPDATE SET
           name = excluded.name,
           industry = excluded.industry,
           employee_count = excluded.employee_count,
           valuation_usd = excluded.valuation_usd,
           address = excluded.address,
           linkedin_url = excluded.linkedin_url,
           updated_at = datetime('now')`
      )
      .bind(
        domain,
        companyProfile.name || domain,
        companyProfile.industry || null,
        companyProfile.employee_count || null,
        companyProfile.valuation_usd || null,
        companyProfile.address ? JSON.stringify(companyProfile.address) : null,
        companyProfile.linkedin_url || null
      )
      .run();
  }

  return companyProfile;
}
