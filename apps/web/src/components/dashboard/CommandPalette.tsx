import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { DASHBOARD_NAV_PATHS } from '../../lib/dashboard/nav';

type CommandItem = {
  id: string;
  label: string;
  path: string;
  group: string;
  keywords?: string;
};

const COMMANDS: CommandItem[] = [
  { id: 'overview', label: 'Overview', path: DASHBOARD_NAV_PATHS.overview, group: 'Build' },
  { id: 'agents', label: 'Agents', path: DASHBOARD_NAV_PATHS.agents, group: 'Build', keywords: 'create voice' },
  { id: 'sandbox', label: 'Sandbox', path: DASHBOARD_NAV_PATHS.sandbox, group: 'Build', keywords: 'test mic call' },
  { id: 'knowledge', label: 'Knowledge base', path: DASHBOARD_NAV_PATHS.knowledge, group: 'Configure', keywords: 'pdf docs rag' },
  { id: 'tools', label: 'Tools', path: DASHBOARD_NAV_PATHS.tools, group: 'Configure', keywords: 'api http webhook' },
  { id: 'voices', label: 'Voices', path: DASHBOARD_NAV_PATHS.voices, group: 'Configure' },
  { id: 'workflows', label: 'Workflows', path: DASHBOARD_NAV_PATHS.workflows, group: 'Configure', keywords: 'flow canvas' },
  { id: 'guardrails', label: 'Guardrails', path: DASHBOARD_NAV_PATHS.guardrails, group: 'Configure', keywords: 'safety policy' },
  { id: 'integrations', label: 'Integrations', path: DASHBOARD_NAV_PATHS.integrations, group: 'Configure' },
  { id: 'conversations', label: 'Conversations', path: DASHBOARD_NAV_PATHS.conversations, group: 'Monitor' },
  { id: 'analytics', label: 'Analytics', path: DASHBOARD_NAV_PATHS.analytics, group: 'Monitor' },
  { id: 'api-keys', label: 'API keys', path: DASHBOARD_NAV_PATHS.apiKeys, group: 'Deploy', keywords: 'vfk secret' },
  { id: 'settings', label: 'Settings', path: DASHBOARD_NAV_PATHS.settings, group: 'Deploy', keywords: 'password credits account' },
  { id: 'docs', label: 'API documentation', path: '/docs', group: 'Help', keywords: 'openapi reference' },
];

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Controlled query from the topbar input (optional). */
  query?: string;
  onQueryChange?: (q: string) => void;
};

export default function CommandPalette({
  open,
  onOpenChange,
  query: controlledQuery,
  onQueryChange,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [internalQuery, setInternalQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = controlledQuery ?? internalQuery;

  const setQuery = useCallback(
    (q: string) => {
      onQueryChange?.(q);
      if (controlledQuery === undefined) setInternalQuery(q);
    },
    [controlledQuery, onQueryChange],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => {
      const hay = `${c.label} ${c.group} ${c.keywords ?? ''} ${c.path}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const run = (item: CommandItem) => {
    onOpenChange(false);
    setQuery('');
    navigate(item.path);
  };

  if (!open) return null;

  return (
    <div
      className="vfy-cmd-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="vfy-cmd-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command search"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="vfy-cmd-input-row">
          <Search size={18} strokeWidth={2.25} aria-hidden />
          <input
            ref={inputRef}
            className="vfy-cmd-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, settings, docs…"
            aria-label="Search dashboard"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && results[activeIndex]) {
                e.preventDefault();
                run(results[activeIndex]);
              }
            }}
          />
          <span className="vfy-top-search-kbd">esc</span>
        </div>
        {results.length === 0 ? (
          <p className="vfy-cmd-empty">No matches for “{query.trim()}”.</p>
        ) : (
          <ul className="vfy-cmd-list" role="listbox">
            {results.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  className={`vfy-cmd-item${i === activeIndex ? ' is-active' : ''}`}
                  onClick={() => run(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span>{item.label}</span>
                  <span className="vfy-cmd-item-meta">{item.group}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Compact topbar search trigger that opens the palette. */
export function TopbarSearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="vfy-top-search" onClick={onOpen} aria-label="Open search">
      <Search size={15} strokeWidth={2.25} aria-hidden />
      <span className="vfy-top-search-input" style={{ pointerEvents: 'none' }}>
        Search…
      </span>
      <span className="vfy-top-search-kbd">⌘K</span>
    </button>
  );
}
