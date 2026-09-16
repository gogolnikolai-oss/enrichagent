import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Forward to new direct Google OAuth callback route
  return NextResponse.redirect(new URL(`/api/auth/google/callback${url.search}`, request.url));
}
