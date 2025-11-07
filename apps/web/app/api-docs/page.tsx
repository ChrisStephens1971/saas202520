'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

/**
 * API Documentation Page - Interactive Swagger UI
 *
 * Provides an interactive interface for exploring and testing the API endpoints.
 * Users can view endpoint details, schemas, and try out requests directly.
 */
export default function ApiDocsPage() {
  return (
    <div className="api-docs-container min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-6 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            API Documentation
          </h1>
          <p className="mt-2 text-gray-600">
            Explore and test the Tournament Platform API endpoints
          </p>
          <div className="mt-4 flex gap-4">
            <a
              href="/api-docs/overview"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Getting Started Guide
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="#authentication"
              className="text-gray-600 hover:text-gray-700"
            >
              Authentication
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="#rate-limiting"
              className="text-gray-600 hover:text-gray-700"
            >
              Rate Limiting
            </a>
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="max-w-7xl mx-auto py-8 px-4">
        <SwaggerUI
          url="/api-docs/openapi.json"
          docExpansion="list"
          defaultModelsExpandDepth={1}
          defaultModelExpandDepth={3}
          displayRequestDuration={true}
          filter={true}
          showExtensions={true}
          showCommonExtensions={true}
          tryItOutEnabled={true}
        />
      </div>

      {/* Custom styles for better integration */}
      <style jsx global>{`
        .swagger-ui {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, sans-serif;
        }

        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin: 20px 0;
        }

        .swagger-ui .scheme-container {
          background: #fafafa;
          padding: 20px;
          border-radius: 8px;
        }

        .swagger-ui .opblock {
          border-radius: 8px;
          margin: 15px 0;
        }

        .swagger-ui .opblock-tag {
          font-size: 18px;
          font-weight: 600;
        }

        .swagger-ui .btn.authorize {
          background-color: #2563eb;
          border-color: #2563eb;
        }

        .swagger-ui .btn.authorize:hover {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}
