import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('ea_session')?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  // 1. Protect dashboard routes
  if (isDashboardRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect logged-in users away from login/signup
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Inject verified user claims as headers for downstream route handlers / components
  const requestHeaders = new Headers(request.headers);
  if (session) {
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-email', session.email);
    requestHeaders.set('x-user-tier', session.tier);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
