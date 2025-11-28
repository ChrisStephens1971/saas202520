/**
 * Sentry Server-Side Configuration
 * Sprint 8 - Production Readiness
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NODE_ENV,

  // Ignore common errors
  ignoreErrors: [
    // Database connection timeouts (handle gracefully)
    'SequelizeConnectionError',
    'Connection terminated unexpectedly',
  ],

  // Filter out sensitive data
  beforeSend(event) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Remove sensitive data from event
    if (event.request) {
      // Remove authorization headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Remove query parameters that might contain sensitive data
      if (event.request.query_string) {
        const sensitiveParams = ['token', 'password', 'secret', 'api_key'];
        sensitiveParams.forEach((param) => {
          if (
            event.request?.query_string &&
            typeof event.request.query_string === 'string' &&
            event.request.query_string.includes(param)
          ) {
            event.request.query_string = '[Filtered]';
          }
        });
      }
    }

    return event;
  },

  // Add context to all events
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console') {
      return null;
    }
    return breadcrumb;
  },
});
