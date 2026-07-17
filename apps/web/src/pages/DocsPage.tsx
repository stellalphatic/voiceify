import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  ExternalLink,
  FileJson,
  Key,
  Search,
  Terminal,
  Zap,
} from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';
import {
  API_ENDPOINTS,
  API_ERRORS,
  API_NAV_SECTIONS,
  API_PERSONAS,
  API_VERSION,
  NDJSON_EVENTS,
} from '@voiceify/shared';

const BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

const NAV_GROUPS: Array<{ title: string; ids: string[] }> = [
  { title: 'Getting started', ids: ['overview', 'authentication'] },
  { title: 'Integrate', ids: ['embed', 'personas'] },
  { title: 'Reference', ids: ['endpoints', 'streaming', 'errors', 'openapi'] },
];

function Callout({ children, kind = 'info' }: { children: React.ReactNode; kind?: 'info' | 'tip' }) {
  return <div className={`docs-callout docs-callout--${kind}`}>{children}</div>;
}

function ParamTable({ rows }: { rows: { name: string; type: string; required?: boolean; desc: string }[] }) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                <code>{r.name}</code>
              </td>
              <td>{r.type}</td>
              <td>{r.required ? 'Yes' : '—'}</td>
              <td>{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useActiveSection() {
  const [active, setActive] = useState<string>(API_NAV_SECTIONS[0].id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-18% 0px -62% 0px' },
    );
    API_NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return active;
}

export default function DocsPage() {
  const active = useActiveSection();
  const [query, setQuery] = useState('');

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    API_NAV_SECTIONS.forEach((s) => map.set(s.id, s.label));
    return map;
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_GROUPS;
    return NAV_GROUPS.map((g) => ({
      ...g,
      ids: g.ids.filter((id) => {
        const label = labelById.get(id) ?? id;
        return label.toLowerCase().includes(q) || id.includes(q);
      }),
    })).filter((g) => g.ids.length > 0);
  }, [query, labelById]);

  const filteredEndpoints = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return API_ENDPOINTS;
    return API_ENDPOINTS.filter(
      (ep) =>
        ep.title.toLowerCase().includes(q) ||
        ep.path.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="docs-page" id="main-content">
      <aside className="docs-sidebar" aria-label="API documentation">
        <div className="docs-sidebar__brand">
          <Link to="/" className="docs-sidebar__logo">
            voiceify
          </Link>
          <span className="docs-sidebar__ver">v{API_VERSION}</span>
        </div>

        <label className="docs-sidebar__search">
          <Search size={14} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs…"
            aria-label="Search documentation"
          />
        </label>

        <nav className="docs-sidebar__nav">
          {filteredGroups.map((group) => (
            <div key={group.title} className="docs-sidebar__group">
              <p className="docs-sidebar__group-title">{group.title}</p>
              {group.ids.map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`docs-sidebar__link${active === id ? ' is-active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(id);
                  }}
                >
                  {labelById.get(id) ?? id}
                </a>
              ))}
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="docs-sidebar__empty">No sections match.</p>
          )}
        </nav>

        <div className="docs-sidebar__footer">
          <a href={`${BASE}/api/openapi.json`} className="docs-sidebar__link" target="_blank" rel="noreferrer">
            <FileJson size={14} /> OpenAPI JSON
          </a>
          <Link to="/demo" className="docs-sidebar__link">
            <ExternalLink size={14} /> Live demo
          </Link>
          <Link to="/dashboard" className="docs-sidebar__link">
            Dashboard
          </Link>
        </div>
      </aside>

      <div className="docs-main">
        <div className="docs-mobile-nav">
          <select
            value={active}
            onChange={(e) => scrollTo(e.target.value)}
            aria-label="Jump to section"
          >
            {API_NAV_SECTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <header className="docs-hero">
          <p className="docs-hero__eyebrow">Developer documentation</p>
          <h1 className="docs-hero__title">Voiceify API</h1>
          <p className="docs-hero__desc">
            Production REST APIs for voice agents, website embeds, API keys, knowledge retrieval, and
            tools. Base URL: <code>{BASE}/api</code>
          </p>
          <div className="docs-hero__actions">
            <a className="docs-hero__btn" href="#overview" onClick={(e) => { e.preventDefault(); scrollTo('overview'); }}>
              Quick start
            </a>
            <a className="docs-hero__btn docs-hero__btn--ghost" href={`${BASE}/api/openapi.json`} target="_blank" rel="noreferrer">
              Download OpenAPI
            </a>
          </div>
        </header>

        <section id="overview" className="docs-section">
          <p className="docs-section__label">
            <BookOpen size={14} /> Overview
          </p>
          <h2>Quick start</h2>
          <p>Check service health, then call a workspace agent with your API key:</p>
          <div className="docs-code-gap">
            <CodeBlock language="bash" filename="health.sh" code={`curl ${BASE}/api/health`} />
          </div>
          <div className="docs-code-gap">
            <CodeBlock
              language="bash"
              filename="agent-turn.sh"
              code={`curl -X POST ${BASE}/api/voice/ORG_ID/agents/AGENT_ID/turn \\
  -H "Authorization: Bearer vfk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Book a table for four at eight","history":[],"language":"auto"}'`}
            />
          </div>
          <Callout kind="tip">
            Create keys in <Link to="/dashboard/api-keys">Dashboard → API keys</Link>. Try the{' '}
            <Link to="/demo">live demo</Link> or <Link to="/dashboard/sandbox">Sandbox</Link> first.
          </Callout>
          <h3>Capabilities</h3>
          <ul>
            <li>
              <strong>Voice turn API</strong> — metered agent replies with STT / LLM / TTS on the
              server
            </li>
            <li>
              <strong>Website embed</strong> — public <code>vw_</code> tokens + <code>/widget.js</code>
            </li>
            <li>
              <strong>Knowledge</strong> — upload docs that inject into live turns
            </li>
            <li>
              <strong>Tools</strong> — HTTP bridges to CRM, POS, databases, and MCP gateways
            </li>
            <li>
              <strong>Languages</strong> — multilingual auto-detect including English and Urdu
            </li>
            <li>
              <strong>Target latency</strong> — sub-500ms time-to-first-audio on the streaming path
            </li>
          </ul>
        </section>

        <section id="authentication" className="docs-section">
          <p className="docs-section__label">
            <Key size={14} /> Authentication
          </p>
          <h2>Workspace API keys</h2>
          <p>
            Production backends should use a workspace key created in the dashboard (
            <code>vfk_…</code>):
          </p>
          <div className="docs-code-gap">
            <CodeBlock
              language="bash"
              code={`Authorization: Bearer vfk_YOUR_KEY
# or
x-voiceify-key: vfk_YOUR_KEY`}
            />
          </div>
          <p>
            Public routes (no key): <code>GET /api/health</code>, <code>GET /api/voice/voices</code>,{' '}
            <code>GET /api/openapi.json</code>, <code>POST /api/public/session</code> (embed token
            required in body).
          </p>
          <Callout>
            Speech and LLM provider secrets stay on the Voiceify API host. Never paste them into
            browser code or customer sites.
          </Callout>
        </section>

        <section id="embed" className="docs-section">
          <p className="docs-section__label">
            <Zap size={14} /> Website embed
          </p>
          <h2>Put an agent on your site</h2>
          <p>
            Generate an embed token in <Link to="/dashboard/api-keys">API keys → Embed widget</Link>,
            then drop the snippet on any page:
          </p>
          <div className="docs-code-gap">
            <CodeBlock
              language="html"
              filename="embed.html"
              code={`<script
  src="${BASE}/widget.js"
  data-token="vw_YOUR_PUBLIC_KEY"
  async
></script>`}
            />
          </div>
          <ParamTable
            rows={[
              { name: 'data-token', type: 'string', required: true, desc: 'Public embed key (vw_…)' },
              {
                name: 'origin allowlist',
                type: 'string[]',
                desc: 'Configured when creating the embed; wildcards supported',
              },
            ]}
          />
          <Callout kind="tip">
            For full server control, prefer the <code>vfk_</code> API key +{' '}
            <code>/api/voice/:orgId/agents/:agentId/turn</code> endpoint instead of the public widget.
          </Callout>
        </section>

        <section id="personas" className="docs-section">
          <p className="docs-section__label">
            <Terminal size={14} /> Personas
          </p>
          <h2>Demo personas</h2>
          <p>
            Pass <code>personaId</code> on demo chat and streaming endpoints:
          </p>
          <div className="docs-persona-grid">
            {API_PERSONAS.map((p) => (
              <div key={p.id} className="docs-persona-card">
                <p className="docs-persona-card__name">{p.name}</p>
                <p className="docs-persona-card__tag">{p.tagline}</p>
                <span className="docs-persona-card__id">personaId: {p.id}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="endpoints" className="docs-section">
          <p className="docs-section__label">
            <Terminal size={14} /> Endpoints
          </p>
          <h2>API reference</h2>
          {query.trim() && (
            <p className="docs-filter-hint">
              Showing {filteredEndpoints.length} endpoint
              {filteredEndpoints.length === 1 ? '' : 's'} matching “{query.trim()}”
            </p>
          )}
          {filteredEndpoints.map((ep) => (
            <article key={ep.id} className="docs-endpoint" id={`endpoint-${ep.id}`}>
              <div className="docs-endpoint__head">
                <span className={`docs-method docs-method--${ep.method.toLowerCase()}`}>
                  {ep.method}
                </span>
                <code className="docs-endpoint__path">{ep.path}</code>
                {ep.auth ? (
                  <span className="docs-badge docs-badge--auth">Auth required</span>
                ) : (
                  <span className="docs-badge">Public</span>
                )}
                {ep.deprecatedAlias ? (
                  <span className="docs-badge docs-badge--deprecated">
                    Alias: {ep.deprecatedAlias}
                  </span>
                ) : null}
              </div>
              <p className="docs-endpoint__title">{ep.title}</p>
              <p className="docs-endpoint__desc">{ep.description}</p>
              {ep.body?.length ? (
                <>
                  <h3>Request body</h3>
                  <ParamTable rows={ep.body} />
                </>
              ) : null}
              {ep.responseFields?.length ? (
                <>
                  <h3>Response fields</h3>
                  <ParamTable rows={ep.responseFields} />
                </>
              ) : null}
              {ep.requestExample ? (
                <div className="docs-code-gap">
                  <CodeBlock language="bash" filename="request" code={ep.requestExample} />
                </div>
              ) : null}
              {ep.responseExample ? (
                <div className="docs-code-gap">
                  <CodeBlock language="json" filename="response" code={ep.responseExample} />
                </div>
              ) : null}
              {ep.notes?.map((note) => (
                <Callout key={note}>{note}</Callout>
              ))}
            </article>
          ))}
          {filteredEndpoints.length === 0 && (
            <p className="docs-filter-hint">No endpoints match this search.</p>
          )}
        </section>

        <section id="streaming" className="docs-section">
          <p className="docs-section__label">
            <Zap size={14} /> Streaming
          </p>
          <h2>NDJSON voice stream</h2>
          <p>
            <code>POST /api/voice/respond</code> returns <code>application/x-ndjson</code> — one JSON
            object per line:
          </p>
          <ParamTable
            rows={NDJSON_EVENTS.map((e) => ({
              name: e.type,
              type: 'event',
              desc: `${e.desc} — ${e.fields}`,
            }))}
          />
          <div className="docs-code-gap">
            <CodeBlock
              language="typescript"
              filename="parse-stream.ts"
              code={`const res = await fetch('/api/voice/respond', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello', personaId: 'restaurant', history: [] }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.type === 'audio') playPcmChunk(event.data);
  }
}`}
            />
          </div>
        </section>

        <section id="errors" className="docs-section">
          <p className="docs-section__label">
            <AlertCircle size={14} /> Errors
          </p>
          <h2>Error codes</h2>
          <div className="docs-table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Meaning</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {API_ERRORS.map((e) => (
                  <tr key={e.code}>
                    <td>
                      <code>{e.code}</code>
                    </td>
                    <td>{e.title}</td>
                    <td>{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="openapi" className="docs-section">
          <p className="docs-section__label">
            <FileJson size={14} /> OpenAPI
          </p>
          <h2>Machine-readable spec</h2>
          <p>Download the OpenAPI 3.1 spec for codegen and API clients:</p>
          <div className="docs-code-gap">
            <CodeBlock language="bash" code={`curl ${BASE}/api/openapi.json`} />
          </div>
          <Callout kind="tip">
            Import into Postman, Insomnia, or{' '}
            <code>npx openapi-typescript {BASE}/api/openapi.json -o ./api-types.ts</code>
          </Callout>
        </section>
      </div>
    </div>
  );
}
