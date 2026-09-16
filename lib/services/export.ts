import * as xlsx from 'xlsx';
import { Contact, Company } from '@/lib/types';

interface ExportRow {
  'First Name': string;
  'Last Name': string;
  'Title': string;
  'Email': string;
  'Mobile Phone': string;
  'Direct Dial': string;
  'LinkedIn': string;
  'Company Name': string;
  'Company Domain': string;
  'Industry': string;
  'Employee Count': number | string;
  'Source': string;
}

function maskEmail(email: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.length > 2 
    ? `${local.substring(0, 2)}${'*'.repeat(local.length - 2)}`
    : local;
    
  return `${maskedLocal}@${domain}`;
}

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  // Basic formatting, could be expanded based on requirements
  return phone;
}

function prepareExportData(contacts: Contact[], companies: Company[]): ExportRow[] {
  const companyMap = new Map(companies.map(c => [c.domain, c]));

  return contacts.map(contact => {
    const company = contact.company_domain ? companyMap.get(contact.company_domain) : null;
    
    return {
      'First Name': contact.first_name,
      'Last Name': contact.last_name,
      'Title': contact.title || '',
      'Email': maskEmail(contact.email),
      'Mobile Phone': formatPhone(contact.mobile_phone),
      'Direct Dial': formatPhone(contact.direct_dial),
      'LinkedIn': contact.linkedin_url || '',
      'Company Name': company?.name || '',
      'Company Domain': contact.company_domain || '',
      'Industry': company?.industry || '',
      'Employee Count': company?.employee_count || '',
      'Source': contact.source
    };
  });
}

export function generateXLSX(contacts: Contact[], companies: Company[]): Uint8Array {
  const data = prepareExportData(contacts, companies);
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');
  
  // Generate buffer
  const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

export function generateCSV(contacts: Contact[], companies: Company[]): string {
  const data = prepareExportData(contacts, companies);
  const worksheet = xlsx.utils.json_to_sheet(data);
  return xlsx.utils.sheet_to_csv(worksheet);
}
