/**
 * Health Check Endpoint
 *
 * Simple health check endpoint for monitoring and load balancers.
 * This is a public endpoint that does NOT require authentication or tenant_id.
 *
 * @returns {Response} 200 OK with { status: 'ok' }
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tournament-platform-api',
    },
    { status: 200 }
  );
}

// Disable caching for health checks
export const dynamic = 'force-dynamic';
