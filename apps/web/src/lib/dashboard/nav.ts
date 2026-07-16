/**
 * Dashboard sidebar route matching — keeps Settings and API keys distinct.
 */
export function isDashboardNavActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/';
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export const DASHBOARD_NAV_PATHS = {
  overview: '/dashboard',
  agents: '/dashboard/agents',
  sandbox: '/dashboard/sandbox',
  knowledge: '/dashboard/knowledge',
  tools: '/dashboard/tools',
  voices: '/dashboard/voices',
  workflows: '/dashboard/workflows',
  conversations: '/dashboard/conversations',
  analytics: '/dashboard/analytics',
  integrations: '/dashboard/integrations',
  guardrails: '/dashboard/guardrails',
  settings: '/dashboard/settings',
  apiKeys: '/dashboard/api-keys',
} as const;
