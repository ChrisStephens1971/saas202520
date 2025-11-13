/**
 * NextAuth.js Middleware - Enhanced Multi-Tenant Context Injection
 * Sprint 9 Phase 3 - API Compression and Performance Optimization
 *
 * This middleware handles:
 * 1. Authentication (redirect unauthenticated users to login)
 * 2. Organization context injection (add tenant headers to requests)
 * 3. Organization selection enforcement (redirect users without org)
 * 4. API response compression (gzip/brotli)
 * 5. Performance tracking and monitoring
 * 6. Response size optimization
 *
 * Multi-Tenant Architecture:
 * - Every authenticated user must have an organization selected
 * - Organization membership is validated during login/org-switch
 * - Tenant context (orgId, orgSlug, role) stored in JWT session
 * - Headers injected for server components to access tenant context
 */

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
// Compression imports removed - not used in middleware
import {
  startRequestTracking,
  endRequestTracking,
} from '@/lib/monitoring/performance-middleware';

/**
 * Check if request is an API route
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * Check if response should be compressed
 */
function shouldCompress(pathname: string): boolean {
  // Compress API responses
  if (pathname.startsWith('/api/')) {
    // Skip compression for streaming endpoints
    if (pathname.includes('/stream') || pathname.includes('/sse')) {
      return false;
    }
    return true;
  }
  return false;
}

export default auth(async (req) => {
  const { nextUrl, auth } = req;
  const isLoggedIn = !!auth?.user;
  const hasOrgSelected = isLoggedIn && !!auth.user.orgId;

  // Start performance tracking for API routes
  let requestId: string | undefined;
  if (isApiRoute(nextUrl.pathname)) {
    requestId = startRequestTracking(req);
  }

  /**
   * Public Routes (No Authentication Required)
   * - Landing page: /
   * - Auth pages: /login, /signup
   * - Auth API: /api/auth/*
   * - Health check: /api/health
   * - Public API endpoints: Add here as needed
   */
  const isPublicRoute =
    nextUrl.pathname === '/' ||
    nextUrl.pathname === '/login' ||
    nextUrl.pathname === '/signup' ||
    nextUrl.pathname.startsWith('/api/auth') ||
    nextUrl.pathname.startsWith('/api/health');

  /**
   * Organization Management Routes
   * - Org selector: /select-organization
   * - Org API: /api/organizations (for listing/creating orgs)
   *
   * These routes are accessible to logged-in users without org selection
   * to allow first-time setup and organization switching.
   */
  const isOrgManagementRoute =
    nextUrl.pathname === '/select-organization' ||
    nextUrl.pathname === '/api/organizations';

  // Redirect logged-in users away from login/signup pages
  if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/signup')) {
    // If user has org, go to dashboard; otherwise go to org selector
    const redirectPath = hasOrgSelected ? '/dashboard' : '/select-organization';
    const response = NextResponse.redirect(new URL(redirectPath, nextUrl));

    // End performance tracking
    if (requestId) {
      endRequestTracking(requestId, response.status);
    }

    return response;
  }

  // Redirect logged-out users to login (except public routes)
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    const response = NextResponse.redirect(loginUrl);

    // End performance tracking
    if (requestId) {
      endRequestTracking(requestId, response.status);
    }

    return response;
  }

  // Redirect logged-in users without org to org selector
  // (except if they're already on org management routes or public routes)
  if (isLoggedIn && !hasOrgSelected && !isOrgManagementRoute && !isPublicRoute) {
    const response = NextResponse.redirect(new URL('/select-organization', nextUrl));

    // End performance tracking
    if (requestId) {
      endRequestTracking(requestId, response.status);
    }

    return response;
  }

  /**
   * Inject Tenant Context Headers
   *
   * These headers are available to:
   * - Server Components (via headers())
   * - API Routes (via request.headers)
   * - Server Actions
   *
   * Headers:
   * - x-org-id: Current organization ID (tenant identifier)
   * - x-org-slug: Organization slug (for URLs, debugging)
   * - x-user-role: User's role in organization (owner, td, scorekeeper, streamer)
   * - x-user-id: User ID (for audit logs, ownership checks)
   */
  const response = NextResponse.next();

  if (isLoggedIn) {
    // Always inject user ID (available even without org)
    response.headers.set('x-user-id', auth.user.id);

    // Inject org context if available
    if (hasOrgSelected) {
      response.headers.set('x-org-id', auth.user.orgId);
      response.headers.set('x-org-slug', auth.user.orgSlug);
      response.headers.set('x-user-role', auth.user.role);
    }
  }

  // Add performance tracking headers for API routes
  if (requestId) {
    response.headers.set('x-request-id', requestId);

    // Note: Compression is handled at the API route level in Next.js App Router
    // because middleware doesn't have access to response bodies.
    // See individual API routes for compression implementation.

    // Add compression hint header
    if (shouldCompress(nextUrl.pathname)) {
      const acceptEncoding = req.headers.get('accept-encoding');
      response.headers.set('x-compression-available', acceptEncoding || 'none');
    }
  }

  return response;
});

/**
 * Middleware Matcher Configuration
 *
 * Runs middleware on all routes except:
 * - Next.js static files (_next/static)
 * - Next.js image optimization (_next/image)
 * - Favicon and other static assets
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
