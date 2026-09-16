import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { d1, UserRecord } from '@/lib/d1';
import { getCurrentSession } from '@/lib/auth/session';
import {
  createGoogleLeadsSpreadsheet,
  appendLeadsToGoogleSheet,
  refreshGoogleAccessToken,
  LeadSheetRow,
} from '@/lib/services/google-sheets';

export const dynamic = 'force-dynamic';

const exportPayloadSchema = z.object({
  leads: z.array(
    z.object({
      name: z.string().default(''),
      typeOrTitle: z.string().default(''),
      companyOrProperty: z.string().default(''),
      addressOrDomain: z.string().default(''),
      cityOrState: z.string().default(''),
      countryOrZip: z.string().default(''),
      phone: z.string().default(''),
      email: z.string().default(''),
      source: z.string().default(''),
      notesOrValue: z.string().optional(),
    })
  ),
  spreadsheetId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const apiKeyHeader =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    let user: UserRecord | null = null;

    if (apiKeyHeader) {
      user = await d1
        .prepare('SELECT * FROM users WHERE api_key = ?')
        .bind(apiKeyHeader)
        .first<UserRecord>();
    } else {
      const session = await getCurrentSession();
      if (session) {
        user = await d1
          .prepare('SELECT * FROM users WHERE id = ?')
          .bind(session.userId)
          .first<UserRecord>();
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const validation = exportPayloadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid payload format', details: validation.error.format() }, { status: 400 });
    }

    // Retrieve Google Sheets tokens from user_provider_keys
    const tokenRow = await d1
      .prepare('SELECT api_key, mcp_endpoint FROM user_provider_keys WHERE user_id = ? AND provider = ?')
      .bind(user.id, 'google_sheets')
      .first<{ api_key: string; mcp_endpoint: string }>();

    if (!tokenRow || !tokenRow.api_key) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Google Account not connected with Sheets permission.',
          connectUrl: '/api/auth/google?intent=sheets',
        },
        { status: 403 }
      );
    }

    let accessToken = tokenRow.api_key;
    const refreshToken = tokenRow.mcp_endpoint;
    let spreadsheetId = validation.data.spreadsheetId;
    let spreadsheetUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : '';

    // If no spreadsheet exists or specified, create a new one
    try {
      if (!spreadsheetId) {
        const newSheet = await createGoogleLeadsSpreadsheet(accessToken, 'EnrichAgent Leads');
        spreadsheetId = newSheet.spreadsheetId;
        spreadsheetUrl = newSheet.spreadsheetUrl;
      }

      const res = await appendLeadsToGoogleSheet(accessToken, spreadsheetId, validation.data.leads as LeadSheetRow[]);

      return NextResponse.json({
        success: true,
        spreadsheetId,
        spreadsheetUrl,
        rowsAppended: res.rowsAppended,
      });
    } catch (err: any) {
      const isScopeInsufficient =
        err.message?.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
        err.message?.includes('insufficient authentication scopes') ||
        err.message?.includes('PERMISSION_DENIED') ||
        err.message?.includes('403');

      if (isScopeInsufficient) {
        try {
          await d1
            .prepare('DELETE FROM user_provider_keys WHERE user_id = ? AND provider = ?')
            .bind(user.id, 'google_sheets')
            .run();
        } catch {
          // ignore
        }

        return NextResponse.json(
          {
            connected: false,
            error: 'Google Sheets permission required. Redirecting to Google to authorize Sheets...',
            connectUrl: '/api/auth/google?intent=sheets',
          },
          { status: 403 }
        );
      }

      // If token expired (401), try refreshing token
      const isUnauthorized = err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED');
      if (isUnauthorized && refreshToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        const refreshed = await refreshGoogleAccessToken(
          refreshToken,
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );

        if (refreshed) {
          accessToken = refreshed.accessToken;
          // Update database with new access token
          await d1
            .prepare('UPDATE user_provider_keys SET api_key = ?, updated_at = datetime("now") WHERE user_id = ? AND provider = ?')
            .bind(accessToken, user.id, 'google_sheets')
            .run();

          // Retry append
          if (!spreadsheetId) {
            const newSheet = await createGoogleLeadsSpreadsheet(accessToken, 'EnrichAgent Leads');
            spreadsheetId = newSheet.spreadsheetId;
            spreadsheetUrl = newSheet.spreadsheetUrl;
          }
          const retryRes = await appendLeadsToGoogleSheet(accessToken, spreadsheetId, validation.data.leads as LeadSheetRow[]);

          return NextResponse.json({
            success: true,
            spreadsheetId,
            spreadsheetUrl,
            rowsAppended: retryRes.rowsAppended,
          });
        }
      }

      throw err;
    }
  } catch (error: any) {
    console.error('❌ [Google Sheets Export Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync with Google Sheets' }, { status: 500 });
  }
}
