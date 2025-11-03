// NextAuth.js Middleware - Protect routes and inject tenant context

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl, auth } = req;
  const isLoggedIn = !!auth?.user;

  // Public routes (login, signup, landing page)
  const isPublicRoute =
    nextUrl.pathname === '/login' ||
    nextUrl.pathname === '/signup' ||
    nextUrl.pathname === '/' ||
    nextUrl.pathname.startsWith('/api/auth');

  // Redirect logged-in users away from login/signup
  if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Redirect logged-out users to login (except public routes)
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Add org context headers for server components
  if (isLoggedIn && auth.user.orgId) {
    const response = NextResponse.next();
    response.headers.set('x-org-id', auth.user.orgId);
    response.headers.set('x-org-slug', auth.user.orgSlug);
    response.headers.set('x-user-role', auth.user.role);
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
