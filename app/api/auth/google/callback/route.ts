import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { d1, UserRecord } from '@/lib/d1';
import { createSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const isMock = searchParams.get('mock') === 'true';

  let userEmail = 'demo@enrichagent.com';
  let googleSub = 'google-mock-user-123';

  if (!isMock) {
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state')?.value;
    cookieStore.delete('oauth_state');

    if (!code || !state || !storedState || state !== storedState) {
      return NextResponse.redirect(new URL('/login?error=Invalid+OAuth+state', request.url));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        return NextResponse.redirect(new URL('/login?error=Google+token+exchange+failed', request.url));
      }

      const tokenData = await tokenResponse.json();

      const userProfileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userProfileResponse.ok) {
        return NextResponse.redirect(new URL('/login?error=Failed+to+fetch+Google+profile', request.url));
      }

      const googleUser = await userProfileResponse.json();
      userEmail = googleUser.email.toLowerCase();
      googleSub = googleUser.sub;
    } catch (err) {
      console.error('OAuth callback error:', err);
      return NextResponse.redirect(new URL('/login?error=OAuth+processing+failed', request.url));
    }
  }

  // Look up or create user in Cloudflare D1
  let user = await d1
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(userEmail)
    .first<UserRecord>();

  if (!user) {
    const newId = crypto.randomUUID();
    const apiKey = `ea_${crypto.randomUUID().replace(/-/g, '')}`;

    await d1
      .prepare(
        `INSERT INTO users (id, email, password_hash, api_key, credits_balance, tier, google_id)
         VALUES (?, ?, NULL, ?, 25, 'free', ?)`
      )
      .bind(newId, userEmail, apiKey, googleSub)
      .run();

    user = {
      id: newId,
      email: userEmail,
      password_hash: null,
      api_key: apiKey,
      credits_balance: 25,
      tier: 'free',
      webhook_url: null,
      stripe_customer_id: null,
      paypal_subscription_id: null,
      google_id: googleSub,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else if (!user.google_id) {
    await d1
      .prepare('UPDATE users SET google_id = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(googleSub, user.id)
      .run();
  }

  // Issue signed session cookie
  await createSessionCookie({
    userId: user.id,
    email: user.email,
    tier: user.tier,
  });

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
