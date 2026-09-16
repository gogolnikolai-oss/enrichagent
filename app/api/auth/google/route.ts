import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    // If not configured, provide mock redirect for dev
    console.warn('⚠️ GOOGLE_CLIENT_ID not configured. Simulating Google OAuth.');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.redirect(`${appUrl}/api/auth/google/callback?mock=true`);
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();

  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const { searchParams } = new URL(request.url);
  const isSheetsIntent = searchParams.get('intent') === 'sheets';

  cookieStore.set('oauth_intent', isSheetsIntent ? 'sheets' : 'login', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const detectedOrigin = host ? `${proto}://${host}` : new URL(request.url).origin;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost'))
    ? process.env.NEXT_PUBLIC_APP_URL
    : detectedOrigin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const scope = isSheetsIntent
    ? 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
    : 'openid email profile';

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state,
    access_type: 'offline',
    prompt: isSheetsIntent ? 'consent' : 'select_account',
  });

  if (isSheetsIntent) {
    params.set('include_granted_scopes', 'true');
  }

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
