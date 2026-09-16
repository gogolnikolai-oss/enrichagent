/**
 * Google Sheets API Integration Service
 * Automatically appends and synchronizes discovered leads directly into Google Sheets.
 */

export interface LeadSheetRow {
  name: string;
  typeOrTitle: string;
  companyOrProperty: string;
  addressOrDomain: string;
  cityOrState: string;
  countryOrZip: string;
  phone: string;
  email: string;
  source: string;
  notesOrValue?: string;
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('Failed to refresh Google access token:', await res.text());
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (err) {
    console.error('Error refreshing Google token:', err);
    return null;
  }
}

/**
 * Creates a brand new Google Spreadsheet in the authenticated user's Google Drive.
 */
export async function createGoogleLeadsSpreadsheet(
  accessToken: string,
  title = 'EnrichAgent Discovered Leads'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const headers = [
    'Date Added',
    'Contact / Owner Name',
    'Title / Entity Type',
    'Company / Property Name',
    'Address / Domain',
    'City / State',
    'Country / Postal Code',
    'Mobile / Phone',
    'Email Address',
    'Estimated Value / Industry',
    'Source / APN',
  ];

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Leads',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
  }

  const sheetData = (await createRes.json()) as { spreadsheetId: string; spreadsheetUrl: string };

  // Append initial Header row with formatting
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetData.spreadsheetId}/values/Leads!A1:K1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Leads!A1:K1',
        majorDimension: 'ROWS',
        values: [headers],
      }),
    }
  );

  return {
    spreadsheetId: sheetData.spreadsheetId,
    spreadsheetUrl: sheetData.spreadsheetUrl,
  };
}

/**
 * Appends lead rows to an existing Google Spreadsheet.
 */
export async function appendLeadsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  leads: LeadSheetRow[]
): Promise<{ rowsAppended: number }> {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const rows = leads.map((lead) => [
    now,
    lead.name || '',
    lead.typeOrTitle || '',
    lead.companyOrProperty || '',
    lead.addressOrDomain || '',
    lead.cityOrState || '',
    lead.countryOrZip || '',
    lead.phone || '',
    lead.email || '',
    lead.notesOrValue || '',
    lead.source || '',
  ]);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:K:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Leads!A:K',
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to append rows to Google Sheet: ${errText}`);
  }

  return { rowsAppended: rows.length };
}
