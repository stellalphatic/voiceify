/**
 * Shared SMB + catalog connectors used by Tools, Integrations, and Workflows.
 */

export type ConnectorBrand =
  | 'google-sheets'
  | 'google-calendar'
  | 'gmail'
  | 'whatsapp'
  | 'slack'
  | 'http'
  | 'supabase'
  | 'mongodb'
  | 'square'
  | 'mcp';

export type ConnectorTemplate = {
  name: string;
  slug: string;
  description: string;
  type: 'http';
  config: Record<string, unknown>;
};

export type ConnectorDef = {
  id: string;
  brand: ConnectorBrand;
  name: string;
  category: 'SMB' | 'CRM' | 'Messaging' | 'Developer Tools';
  description: string;
  badge?: string;
  /** Short setup steps shown in the connect modal. */
  setupSteps: string[];
  /** Field labels for the quick-setup form. */
  fields: Array<{
    key: 'url' | 'token' | 'extra';
    label: string;
    placeholder: string;
    help?: string;
  }>;
  template: ConnectorTemplate;
};

export const SMB_CONNECTORS: ConnectorDef[] = [
  {
    id: 'google-sheets',
    brand: 'google-sheets',
    name: 'Google Sheets',
    category: 'SMB',
    description: 'Log leads and bookings into a spreadsheet your team already uses.',
    badge: 'SMB',
    setupSteps: [
      'Open Google Sheets → Extensions → Apps Script.',
      'Paste a doPost() that appends JSON fields to a row.',
      'Deploy as Web App (Anyone with link) and paste the URL below.',
    ],
    fields: [
      {
        key: 'url',
        label: 'Apps Script web app URL',
        placeholder: 'https://script.google.com/macros/s/.../exec',
        help: 'Must start with https://script.google.com/',
      },
    ],
    template: {
      name: 'Google Sheets Logger',
      slug: 'google_sheets_log',
      description: 'Append a lead or booking row to Google Sheets',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate:
          '{"name":"{{name}}","phone":"{{phone}}","notes":"{{notes}}","source":"voiceify"}',
      },
    },
  },
  {
    id: 'google-calendar',
    brand: 'google-calendar',
    name: 'Google Calendar',
    category: 'SMB',
    description: 'Create calendar events when a caller books an appointment.',
    badge: 'SMB',
    setupSteps: [
      'Create an Apps Script that inserts Calendar events from JSON.',
      'Deploy as Web App and paste the URL.',
      'Your agent will POST title, datetime, guest, and phone.',
    ],
    fields: [
      {
        key: 'url',
        label: 'Calendar webhook URL',
        placeholder: 'https://script.google.com/macros/s/.../exec',
      },
    ],
    template: {
      name: 'Google Calendar Booking',
      slug: 'google_calendar_book',
      description: 'Create a calendar event from a voice booking',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://script.google.com/macros/s/YOUR_CALENDAR_DEPLOYMENT/exec',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate:
          '{"title":"{{title}}","start":"{{datetime}}","guest":"{{customerName}}","phone":"{{phone}}"}',
      },
    },
  },
  {
    id: 'gmail-notify',
    brand: 'gmail',
    name: 'Email (Gmail / Outlook)',
    category: 'SMB',
    description: 'Email yourself when a new booking or lead is captured.',
    badge: 'SMB',
    setupSteps: [
      'Create a Zapier, Make, or n8n webhook that sends Gmail/Outlook mail.',
      'Paste the catch hook URL below.',
      'Agents will POST to, subject, body, and customer name.',
    ],
    fields: [
      {
        key: 'url',
        label: 'Email webhook URL',
        placeholder: 'https://hooks.zapier.com/hooks/catch/.../',
      },
    ],
    template: {
      name: 'Email Notify',
      slug: 'email_notify',
      description: 'Email ops on new booking',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate:
          '{"to":"{{to}}","subject":"New Voiceify booking","body":"{{summary}}","customer":"{{customerName}}"}',
      },
    },
  },
  {
    id: 'whatsapp-business',
    brand: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'SMB',
    description: 'Send WhatsApp follow-ups via Meta Cloud API after a call.',
    badge: 'SMB',
    setupSteps: [
      'In Meta Business, create a WhatsApp Cloud API app.',
      'Copy Phone Number ID and permanent access token.',
      'Paste both below. Agents will message the caller phone.',
    ],
    fields: [
      {
        key: 'url',
        label: 'Messages API URL',
        placeholder: 'https://graph.facebook.com/v19.0/PHONE_NUMBER_ID/messages',
        help: 'Replace PHONE_NUMBER_ID with yours from Meta.',
      },
      {
        key: 'token',
        label: 'Access token',
        placeholder: 'EAAB...',
      },
    ],
    template: {
      name: 'WhatsApp Follow-up',
      slug: 'whatsapp_followup',
      description: 'Send WhatsApp text after a booking',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID/messages',
        headers: {
          Authorization: 'Bearer YOUR_WHATSAPP_TOKEN',
          'Content-Type': 'application/json',
        },
        bodyTemplate:
          '{"messaging_product":"whatsapp","to":"{{phone}}","type":"text","text":{"body":"{{summary}}"}}',
      },
    },
  },
];

export const DEV_CONNECTORS: ConnectorDef[] = [
  {
    id: 'http-webhook',
    brand: 'http',
    name: 'Custom HTTP',
    category: 'Developer Tools',
    description: 'Call any REST endpoint from the agent turn.',
    setupSteps: ['Paste a public HTTPS URL your agent can call.'],
    fields: [{ key: 'url', label: 'Webhook URL', placeholder: 'https://example.com/hooks/voiceify' }],
    template: {
      name: 'Custom HTTP',
      slug: 'custom_http',
      description: 'Generic HTTPS webhook',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://example.com/hooks/voiceify',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate: '{"event":"{{event}}","payload":{{payload}}}',
      },
    },
  },
  {
    id: 'supabase',
    brand: 'supabase',
    name: 'Supabase / Postgres',
    category: 'CRM',
    description: 'Query or insert rows via your Supabase REST API.',
    badge: 'HTTP',
    setupSteps: ['Paste your PostgREST table URL and anon/service key.'],
    fields: [
      {
        key: 'url',
        label: 'REST URL',
        placeholder: 'https://YOUR_PROJECT.supabase.co/rest/v1/leads',
      },
      { key: 'token', label: 'API key', placeholder: 'eyJ...' },
    ],
    template: {
      name: 'Supabase REST',
      slug: 'supabase_rest',
      description: 'PostgREST insert or select',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://YOUR_PROJECT.supabase.co/rest/v1/leads',
        headers: {
          apikey: 'YOUR_ANON_OR_SERVICE_KEY',
          Authorization: 'Bearer YOUR_ANON_OR_SERVICE_KEY',
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        bodyTemplate: '{"name":"{{name}}","phone":"{{phone}}","source":"voiceify"}',
      },
    },
  },
  {
    id: 'mongodb',
    brand: 'mongodb',
    name: 'MongoDB Atlas Data API',
    category: 'Developer Tools',
    description: 'Insert or find documents through Atlas Data API.',
    badge: 'HTTP',
    setupSteps: ['Paste your Atlas Data API endpoint and API key.'],
    fields: [
      {
        key: 'url',
        label: 'Data API URL',
        placeholder: 'https://data.mongodb-api.com/app/.../action/insertOne',
      },
      { key: 'token', label: 'API key', placeholder: '...' },
    ],
    template: {
      name: 'MongoDB Data API',
      slug: 'mongodb_data_api',
      description: 'Atlas Data API insertOne',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://data.mongodb-api.com/app/YOUR_APP/endpoint/data/v1/action/insertOne',
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'YOUR_DATA_API_KEY',
        },
        bodyTemplate:
          '{"dataSource":"Cluster0","database":"voiceify","collection":"events","document":{{payload}}}',
      },
    },
  },
  {
    id: 'square',
    brand: 'square',
    name: 'Square POS',
    category: 'CRM',
    description: 'Look up catalog or create orders via Square APIs.',
    badge: 'HTTP',
    setupSteps: ['Paste Square access token and orders endpoint.'],
    fields: [
      { key: 'url', label: 'Orders URL', placeholder: 'https://connect.squareup.com/v2/orders' },
      { key: 'token', label: 'Access token', placeholder: 'EAA...' },
    ],
    template: {
      name: 'Square Orders',
      slug: 'square_orders',
      description: 'Create a Square order draft',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://connect.squareup.com/v2/orders',
        headers: {
          Authorization: 'Bearer YOUR_SQUARE_TOKEN',
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        bodyTemplate: '{"order":{"location_id":"YOUR_LOCATION","line_items":{{items}}}}',
      },
    },
  },
  {
    id: 'slack',
    brand: 'slack',
    name: 'Slack',
    category: 'Messaging',
    description: 'Post call summaries to a Slack channel.',
    setupSteps: ['Create an Incoming Webhook in Slack and paste the URL.'],
    fields: [
      {
        key: 'url',
        label: 'Incoming webhook URL',
        placeholder: 'https://hooks.slack.com/services/...',
      },
    ],
    template: {
      name: 'Slack Incoming Webhook',
      slug: 'slack_notify',
      description: 'Notify ops on Slack',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate: '{"text":"Voiceify: {{summary}}"}',
      },
    },
  },
  {
    id: 'mcp',
    brand: 'mcp',
    name: 'Custom MCP bridge',
    category: 'Developer Tools',
    description: 'Bridge Model Context Protocol tools over HTTPS to your MCP gateway.',
    badge: 'Alpha',
    setupSteps: ['Paste your MCP HTTP gateway URL.'],
    fields: [{ key: 'url', label: 'MCP gateway URL', placeholder: 'https://mcp.example.com/tools' }],
    template: {
      name: 'MCP Bridge',
      slug: 'mcp_bridge',
      description: 'Forward tool calls to an MCP HTTP gateway',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://mcp.example.com/tools/call',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate: '{"name":"{{tool}}","arguments":{{payload}}}',
      },
    },
  },
];

export const ALL_CONNECTORS: ConnectorDef[] = [...SMB_CONNECTORS, ...DEV_CONNECTORS];

export const CONNECTOR_CATEGORIES = [
  'All integrations',
  'SMB',
  'CRM',
  'Messaging',
  'Developer Tools',
] as const;

export function findConnectorBySlug(slug: string): ConnectorDef | undefined {
  return ALL_CONNECTORS.find((c) => c.template.slug === slug);
}

export function findConnectorById(id: string): ConnectorDef | undefined {
  return ALL_CONNECTORS.find((c) => c.id === id);
}

/** Build install payload from connector + user-entered fields. */
export function buildConnectorInstallPayload(
  connector: ConnectorDef,
  values: { url: string; token?: string },
): ConnectorTemplate {
  const config = { ...connector.template.config } as Record<string, unknown>;
  const headers = {
    ...((config.headers as Record<string, string> | undefined) ?? {}),
  };

  if (values.url.trim()) {
    config.url = values.url.trim();
  }

  if (values.token?.trim()) {
    if (connector.brand === 'whatsapp' || connector.brand === 'square') {
      headers.Authorization = `Bearer ${values.token.trim()}`;
    } else if (connector.brand === 'supabase') {
      headers.apikey = values.token.trim();
      headers.Authorization = `Bearer ${values.token.trim()}`;
    } else if (connector.brand === 'mongodb') {
      headers['api-key'] = values.token.trim();
    } else {
      headers.Authorization = `Bearer ${values.token.trim()}`;
    }
  }

  config.headers = headers;

  return {
    ...connector.template,
    config,
  };
}
