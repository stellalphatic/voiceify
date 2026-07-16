export type DashboardCrumb = { label: string; to?: string };

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
  if (tail === 'agents') return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Agents' }];
  if (tail === 'sandbox') return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Sandbox' }];
  if (tail === 'analytics') return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Analytics' }];
  if (tail === 'settings') return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }];
  if (tail === 'api-keys') return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'API keys' }];
  if (tail === 'integrations') {
    return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Integrations' }];
  }
  return [
    { label: 'Dashboard', to: '/dashboard' },
    { label: tail.charAt(0).toUpperCase() + tail.slice(1) },
  ];
}
