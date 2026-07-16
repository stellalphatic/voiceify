export type DashboardCrumb = { label: string; to?: string };

const LABELS: Record<string, string> = {
  agents: 'Agents',
  sandbox: 'Sandbox',
  knowledge: 'Knowledge base',
  tools: 'Tools',
  voices: 'Voices',
  workflows: 'Workflows',
  conversations: 'Conversations',
  analytics: 'Analytics',
  integrations: 'Integrations',
  guardrails: 'Guardrails',
  settings: 'Settings',
  'api-keys': 'API keys',
};

/**
 * Breadcrumb labels for dashboard topbar from pathname.
 */
export function buildDashboardCrumbs(pathname: string): DashboardCrumb[] {
  const tail = pathname.replace(/^\/dashboard\/?/, '');

  if (!tail) return [{ label: 'Dashboard' }, { label: 'Overview' }];
  if (tail.startsWith('agents/')) {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Agents', to: '/dashboard/agents' },
      { label: 'Detail' },
    ];
  }

  const top = tail.split('/')[0] ?? tail;
  const label = LABELS[top] ?? top.charAt(0).toUpperCase() + top.slice(1);
  return [{ label: 'Dashboard', to: '/dashboard' }, { label }];
}
