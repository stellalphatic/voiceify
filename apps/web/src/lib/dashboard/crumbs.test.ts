import { describe, it, expect } from 'vitest';
import { buildDashboardCrumbs } from './crumbs';

describe('buildDashboardCrumbs', () => {
  it('returns overview crumbs for dashboard root', () => {
    expect(buildDashboardCrumbs('/dashboard')).toEqual([
      { label: 'Dashboard' },
      { label: 'Overview' },
    ]);
  });

  it('returns settings crumbs', () => {
    expect(buildDashboardCrumbs('/dashboard/settings')).toEqual([
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Settings' },
    ]);
  });

  it('returns api-keys crumbs separately from settings', () => {
    expect(buildDashboardCrumbs('/dashboard/api-keys')).toEqual([
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'API keys' },
    ]);
  });

  it('returns knowledge / tools / workflows crumbs', () => {
    expect(buildDashboardCrumbs('/dashboard/knowledge')[1]?.label).toBe('Knowledge base');
    expect(buildDashboardCrumbs('/dashboard/tools')[1]?.label).toBe('Tools');
    expect(buildDashboardCrumbs('/dashboard/workflows')[1]?.label).toBe('Workflows');
  });

  it('returns agent detail trail', () => {
    expect(buildDashboardCrumbs('/dashboard/agents/abc')).toEqual([
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Agents', to: '/dashboard/agents' },
      { label: 'Detail' },
    ]);
  });
});
