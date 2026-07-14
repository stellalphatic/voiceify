/**
 * LegalPageLayout.tsx — Shared layout for Privacy / Terms / Cookies / etc.
 * Provides consistent typography, table-of-contents, and last-updated metadata.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface LegalSection {
  id:    string;
  title: string;
  body:  React.ReactNode;
}

interface Props {
  eyebrow:     string;
  title:       string;
  intro:       string;
  lastUpdated: string;
  sections:    LegalSection[];
}

export default function LegalPageLayout({ eyebrow, title, intro, lastUpdated, sections }: Props) {
  return (
    <div className="min-h-screen bg-voice-bg text-voice-text font-sans selection:bg-voice-accent selection:text-voice-on-accent pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="max-w-3xl mb-12">
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
              color: 'var(--color-accent)',
            }}>
            {eyebrow}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-voice-muted leading-relaxed mb-3">{intro}</p>
          <p className="text-xs text-voice-muted">Last updated: {lastUpdated}</p>
        </div>

        {/* ── Body + ToC ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12">

          {/* Sticky ToC (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-xs font-semibold uppercase tracking-wider text-voice-muted mb-4">On this page</p>
              <ul className="space-y-1.5 border-l border-voice-frost-border">
                {sections.map(s => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block pl-4 py-1.5 -ml-px text-sm text-voice-muted hover:text-voice-accent border-l border-transparent hover:border-voice-accent transition-colors">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="mt-6 inline-flex items-center gap-1 text-xs text-voice-accent hover:underline">
                Questions? Contact us <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <article className="legal-prose max-w-3xl">
            {sections.map(s => (
              <section key={s.id} id={s.id} className="mb-10 scroll-mt-28">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 tracking-tight">{s.title}</h2>
                <div className="text-voice-muted leading-relaxed space-y-4 text-base">
                  {s.body}
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>

      <style>{`
        .legal-prose ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .legal-prose ul li {
          margin-bottom: 0.5rem;
        }
        .legal-prose a {
          color: var(--color-accent);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .legal-prose a:hover {
          opacity: 0.85;
        }
      `}</style>
    </div>
  );
}
