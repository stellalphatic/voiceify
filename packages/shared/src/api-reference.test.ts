import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS, API_PERSONAS, buildOpenApiSpec } from './api-reference';

describe('api-reference', () => {
  it('lists all live endpoints', () => {
    expect(API_ENDPOINTS.length).toBeGreaterThanOrEqual(8);
    const paths = API_ENDPOINTS.map((e) => e.path);
    expect(paths).toContain('/api/health');
    expect(paths).toContain('/api/voice/respond');
    expect(paths).toContain('/api/public/session/turn');
    expect(paths).toContain('/api/orgs/:orgId/privacy/export');
    expect(paths).toContain('/api/openapi.json');
    expect(paths).not.toContain('/api/voice-chat');
  });

  it('documents real persona ids', () => {
    expect(API_PERSONAS.map((p) => p.id)).toEqual(['restaurant', 'healthcare', 'support']);
  });

  it('builds valid OpenAPI spec', () => {
    const spec = buildOpenApiSpec('https://voiceify.online/api');
    expect(spec.openapi).toBe('3.1.0');
    expect((spec.paths as Record<string, unknown>)['/health']).toBeDefined();
    expect(
      (spec.paths as Record<string, unknown>)[
        '/voice/{orgId}/agents/{agentId}/turn'
      ],
    ).toBeDefined();
    expect(spec.servers).toEqual([{ url: 'https://voiceify.online/api' }]);
  });
});
