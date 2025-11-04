/**
 * Contract Tests: Tenant Isolation
 * Validates that all endpoints enforce tenant_id scoping
 */

import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import yaml from 'yaml';

describe('Tenant Isolation Contract Tests', () => {
  let spec: any;

  beforeAll(() => {
    const specFile = fs.readFileSync('packages/api-contracts/openapi.yaml', 'utf8');
    spec = yaml.parse(specFile);
  });

  test('All schemas include tenant_id field', () => {
    const schemas = spec.components.schemas;
    const resourceSchemas = ['Tournament', 'Player']; // Add more as needed

    for (const schemaName of resourceSchemas) {
      const schema = schemas[schemaName];
      expect(schema.properties).toHaveProperty('tenant_id');
      expect(schema.properties.tenant_id.type).toBe('string');
      expect(schema.properties.tenant_id.format).toBe('uuid');
    }
  });

  test('All endpoints require X-Tenant-ID header', () => {
    const paths = spec.paths;

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (method === 'parameters') continue;

        const params = operation.parameters || [];
        const hasTenantHeader = params.some(
          (p: any) => p.$ref === '#/components/parameters/TenantId'
        );

        expect(hasTenantHeader).toBe(true);
      }
    }
  });

  test('Tenant parameter is marked as required', () => {
    const tenantParam = spec.components.parameters.TenantId;

    expect(tenantParam.required).toBe(true);
    expect(tenantParam.in).toBe('header');
    expect(tenantParam.schema.format).toBe('uuid');
  });

  test('No endpoints allow cross-tenant access', () => {
    // This test validates spec structure
    // Runtime validation happens in E2E tests

    const paths = spec.paths;

    for (const [path, methods] of Object.entries(paths)) {
      // Check that path doesn't allow tenant override via path param
      expect(path).not.toMatch(/\/tenants\/\{tenant_id\}\//);
    }
  });
});