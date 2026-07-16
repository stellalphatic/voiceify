import { describe, it, expect } from 'vitest';
import { isDashboardNavActive, DASHBOARD_NAV_PATHS } from './nav';

describe('isDashboardNavActive', () => {
  it('matches dashboard root only for overview', () => {
    expect(isDashboardNavActive('/dashboard', DASHBOARD_NAV_PATHS.overview)).toBe(true);
    expect(isDashboardNavActive('/dashboard/', DASHBOARD_NAV_PATHS.overview)).toBe(true);
    expect(isDashboardNavActive('/dashboard/agents', DASHBOARD_NAV_PATHS.overview)).toBe(false);
  });

  it('highlights settings only on settings route', () => {
    expect(isDashboardNavActive('/dashboard/settings', DASHBOARD_NAV_PATHS.settings)).toBe(true);
    expect(isDashboardNavActive('/dashboard/api-keys', DASHBOARD_NAV_PATHS.settings)).toBe(false);
  });

  it('highlights api-keys only on api-keys route', () => {
    expect(isDashboardNavActive('/dashboard/api-keys', DASHBOARD_NAV_PATHS.apiKeys)).toBe(true);
    expect(isDashboardNavActive('/dashboard/settings', DASHBOARD_NAV_PATHS.apiKeys)).toBe(false);
  });

  it('matches nested agent detail under agents', () => {
    expect(isDashboardNavActive('/dashboard/agents/42', DASHBOARD_NAV_PATHS.agents)).toBe(true);
    expect(isDashboardNavActive('/dashboard/agents', DASHBOARD_NAV_PATHS.agents)).toBe(true);
  });
});
