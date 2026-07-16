export type SettingsFocus = 'settings' | 'api-keys';

export type SettingsPageMeta = {
  title: string;
  eyebrow: string;
  subtitle: string;
  showBilling: boolean;
  showDevelopers: boolean;
};

export function getSettingsPageMeta(focus: SettingsFocus): SettingsPageMeta {
  const showBilling = focus === 'settings';
  const showDevelopers = focus === 'api-keys';

  return {
    showBilling,
    showDevelopers,
    title: showDevelopers ? 'API keys' : 'Settings',
    eyebrow: showDevelopers ? '// developers · keys' : '// settings · workspace',
    subtitle: showDevelopers
      ? 'Server-to-server API keys and embed widgets for your sites.'
      : 'Account, password, live credit balance and ledger, and workspace preferences.',
  };
}

export function validateAgentName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  return undefined;
}
