import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS, API_PERSONAS, buildOpenApiSpec } from './api-reference';

describe('api-reference', () => {
  it('lists all live endpoints', () => {
    expect(API_ENDPOINTS.length).toBeGreaterThanOrEqual(8);
    const paths = API_ENDPOINTS.map((e) => e.path);
    expect(paths).toContain('/api/health');
    expect(paths).toContain('/api/voice/respond');
    expect(paths).toContain('/api/openapi');
  });

  it('documents real persona ids', () => {
    expect(API_PERSONAS.map((p) => p.id)).toEqual(['restaurant', 'healthcare', 'support']);
  });

  it('builds valid OpenAPI spec', () => {
    const spec = buildOpenApiSpec('http://localhost:5173');
    expect(spec.openapi).toBe('3.1.0');
    expect((spec.paths as Record<string, unknown>)['/health']).toBeDefined();
  });
});
