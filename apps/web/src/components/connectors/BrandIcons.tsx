import type { ReactElement, ReactNode } from 'react';
import type { ConnectorBrand } from '../../lib/connectors/catalog';

type IconProps = { size?: number; className?: string; title?: string };

function Svg({
  size = 22,
  className,
  title,
  children,
  viewBox = '0 0 24 24',
}: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function GoogleSheetsIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'Google Sheets'}>
      <path fill="#0F9D58" d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
      <path fill="#fff" d="M7 7h10v2H7V7Zm0 4h10v2H7v-2Zm0 4h6v2H7v-2Z" />
    </Svg>
  );
}

export function GoogleCalendarIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'Google Calendar'}>
      <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
      <path fill="#fff" d="M5 10h14v10H5V10Z" />
      <path fill="#EA4335" d="M7 12h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z" />
      <path fill="#34A853" d="M7 16h2v2H7v-2Zm4 0h2v2h-2v-2Z" />
      <path fill="#FBBC05" d="M15 16h2v2h-2v-2Z" />
    </Svg>
  );
}

export function GmailIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'Gmail'}>
      <path fill="#EA4335" d="M3 6.5 12 13l9-6.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z" />
      <path fill="#C5221F" d="M3 6.5 12 13l9-6.5L12 4 3 6.5Z" />
      <path fill="#4285F4" d="M3 6.5V18l5-4.2V9.8L3 6.5Z" />
      <path fill="#34A853" d="M21 6.5V18l-5-4.2V9.8L21 6.5Z" />
    </Svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'WhatsApp'}>
      <path
        fill="#25D366"
        d="M12 2a10 10 0 0 0-8.66 15.05L2 22l5.1-1.34A10 10 0 1 0 12 2Z"
      />
      <path
        fill="#fff"
        d="M16.7 14.4c-.25-.12-1.48-.73-1.71-.81-.23-.09-.4-.12-.57.12-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.38.11-.5.12-.12.25-.29.38-.44.12-.15.17-.25.25-.42.09-.17.04-.32-.02-.44-.06-.12-.57-1.37-.78-1.88-.2-.48-.41-.42-.57-.42h-.49c-.17 0-.44.06-.67.32-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.17-.48-.29Z"
      />
    </Svg>
  );
}

export function SlackIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'Slack'}>
      <path fill="#E01E5A" d="M9.5 14.5a2 2 0 1 1-2-2h2v2Z" />
      <path fill="#E01E5A" d="M10 14.5a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0v-5Z" />
      <path fill="#36C5F0" d="M9.5 9.5a2 2 0 1 1 2-2v2h-2Z" />
      <path fill="#36C5F0" d="M9.5 10a2 2 0 1 1 0 4h-5a2 2 0 1 1 0-4h5Z" />
      <path fill="#2EB67D" d="M14.5 9.5a2 2 0 1 1 2 2h-2v-2Z" />
      <path fill="#2EB67D" d="M14 9.5a2 2 0 1 1-4 0v-5a2 2 0 1 1 4 0v5Z" />
      <path fill="#ECB22E" d="M14.5 14.5a2 2 0 1 1-2 2v-2h2Z" />
      <path fill="#ECB22E" d="M14.5 14a2 2 0 1 1 0-4h5a2 2 0 1 1 0 4h-5Z" />
    </Svg>
  );
}

export function SupabaseIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'Supabase'}>
      <path fill="#3ECF8E" d="M13.4 2.4c.5-.8 1.7-.4 1.6.6l-1.2 10.3h4.5c.9 0 1.3 1.1.7 1.8L10.6 21.6c-.5.8-1.7.4-1.6-.6l1.2-10.3H5.7c-.9 0-1.3-1.1-.7-1.8L13.4 2.4Z" />
    </Svg>
  );
}

export function MongoIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'MongoDB'}>
      <path
        fill="#47A248"
        d="M12.2 2s.4 2.1-.8 4.1C9.8 8 10.8 10 10.8 10s-1.7-1-1.3-3.6C9.8 3.8 12.2 2 12.2 2Zm-.4 6.2s1.9 1.5 1.5 4.4c-.4 2.9-2 5.8-2.2 9.4 0 0-3.1-1.5-2.5-6.3.5-4.1 3.2-7.5 3.2-7.5Z"
      />
      <path fill="#B8C4C2" d="M12.1 21.8c0-.2.1-4.3.8-6.5.3 1.7.2 5.3-.1 6.5-.1.4-.5.4-.7 0Z" />
    </Svg>
  );
}

export function SquareIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'Square'}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#000" />
      <rect x="8" y="8" width="8" height="8" rx="1.5" fill="#fff" />
    </Svg>
  );
}

export function HttpIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'HTTP'}>
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#64748B" />
      <path fill="#fff" d="M6 10h3v1.2H7.2V14H6v-4Zm4.2 0H12c.9 0 1.5.5 1.5 1.3S12.9 12.6 12 12.6h-.6V14H10.2v-4Zm1.2 1.1v1.3h.5c.3 0 .5-.1.5-.4s-.2-.4-.5-.4h-.5ZM15 10h2.8v1.1H16v.6h1.5v1H16v.7h1.9V14H15v-4Z" />
    </Svg>
  );
}

export function McpIcon(props: IconProps) {
  return (
    <Svg {...props} title={props.title ?? 'MCP'}>
      <circle cx="12" cy="12" r="9" fill="#7C3AED" />
      <path fill="#fff" d="M8 12a4 4 0 0 1 4-4v2.2a1.8 1.8 0 1 0 0 3.6V16a4 4 0 0 1-4-4Z" />
    </Svg>
  );
}

const MAP: Record<ConnectorBrand, (p: IconProps) => ReactElement> = {
  'google-sheets': GoogleSheetsIcon,
  'google-calendar': GoogleCalendarIcon,
  gmail: GmailIcon,
  whatsapp: WhatsAppIcon,
  slack: SlackIcon,
  http: HttpIcon,
  supabase: SupabaseIcon,
  mongodb: MongoIcon,
  square: SquareIcon,
  mcp: McpIcon,
};

export function BrandIcon({
  brand,
  size = 22,
  className,
}: {
  brand: ConnectorBrand;
  size?: number;
  className?: string;
}) {
  const Comp = MAP[brand] ?? HttpIcon;
  return <Comp size={size} className={className} />;
}
