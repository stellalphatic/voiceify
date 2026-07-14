/**
 * ChangelogPage.tsx — Phase 1 Polish (April 2026)
 * Timeline-style changelog with version chips + categorised changes.
 */
import React from 'react';
import { Sparkles, Wrench, Zap, Shield } from 'lucide-react';

interface Change {
  type:   'feature' | 'improvement' | 'fix' | 'security';
  text:   string;
}
interface Release {
  version: string;
  date:    string;
  title:   string;
  changes: Change[];
}

const ICON: Record<Change['type'], { Icon: typeof Sparkles; color: string }> = {
  feature:     { Icon: Sparkles, color: 'var(--color-accent)' },
  improvement: { Icon: Zap,      color: 'var(--accent-info)' },
  fix:         { Icon: Wrench,   color: 'var(--accent-fast)' },
  security:    { Icon: Shield,   color: 'var(--accent-crit)' },
};

const RELEASES: Release[] = [
  {
    version: '2.4.0',
    date:    'April 2026',
    title:   'Custom n8n workflow plan',
    changes: [
      { type: 'feature',     text: 'New Custom plan: bespoke n8n workflows designed and shipped by Voiceify engineers.' },
      { type: 'feature',     text: 'Three new pre-built personas: Restaurant Reservation, Dental Appointment Setter, Customer Care.' },
      { type: 'improvement', text: 'Hero pipeline now shows live STT/LLM/TTS latency breakdown.' },
      { type: 'improvement', text: 'Full responsive overhaul across landing, pricing, and marketing pages.' },
    ],
  },
  {
    version: '2.3.0',
    date:    'February 2026',
    title:   'Dark / light theme polish',
    changes: [
      { type: 'feature',     text: 'Complete VoltAgent design system rollout with smooth theme transitions.' },
      { type: 'improvement', text: 'Improved contrast ratios across all UI elements (WCAG AA compliant).' },
      { type: 'fix',         text: 'Fixed flash of unstyled content (FOUC) when switching themes.' },
      { type: 'security',    text: 'Removed hardcoded API keys from client bundle; environment variables only.' },
    ],
  },
  {
    version: '2.2.0',
    date:    'January 2026',
    title:   'Multilingual support',
    changes: [
      { type: 'feature',     text: 'Added support for 40+ languages including Urdu, Hindi, Arabic, and Swahili.' },
      { type: 'feature',     text: 'Automatic Language Identification (LID) — detects language switches mid-call.' },
      { type: 'improvement', text: 'Reduced latency for non-English languages by 35% on average.' },
    ],
  },
  {
    version: '2.1.0',
    date:    'November 2025',
    title:   'Real-time analytics',
    changes: [
      { type: 'feature',     text: 'Live call dashboard with sentiment tracking and intent detection.' },
      { type: 'feature',     text: 'n8n webhook integration for any call event.' },
      { type: 'fix',         text: 'Fixed audio cut-off issue on long pauses.' },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-voice-bg text-voice-text font-sans selection:bg-voice-accent selection:text-voice-on-accent pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
              color: 'var(--color-accent)',
            }}>
            Changelog
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">What&apos;s new in Voiceify.</h1>
          <p className="text-lg text-voice-muted leading-relaxed max-w-xl mx-auto">
            Every shipped feature, every fix, every improvement. We move fast and document publicly.
          </p>
        </div>

        {/* ── Timeline ── */}
        <div className="relative">
          {/* Vertical line */}
          <div
            aria-hidden
            className="absolute left-3 sm:left-4 top-2 bottom-0 w-px"
            style={{ background: 'var(--color-border)' }}
          />

          <div className="space-y-12">
            {RELEASES.map((release, i) => (
              <div key={release.version} className="relative pl-10 sm:pl-12">
                {/* Dot */}
                <div
                  className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2"
                  style={{
                    background: i === 0 ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    borderColor: i === 0 ? 'var(--color-accent)' : 'var(--color-border-strong)',
                  }}
                >
                  {i === 0 && <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-voice-on-accent" />}
                </div>

                {/* Content */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: i === 0 ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'var(--color-bg-tertiary)',
                      color: i === 0 ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    v{release.version}
                  </span>
                  <span className="text-xs text-voice-muted">{release.date}</span>
                  {i === 0 && (
                    <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}>
                      Latest
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold mb-5 tracking-tight">{release.title}</h2>

                <ul className="space-y-3">
                  {release.changes.map((change, j) => {
                    const { Icon, color } = ICON[change.type];
                    return (
                      <li key={j} className="flex items-start gap-3 text-sm text-voice-muted leading-relaxed">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: `color-mix(in srgb, ${color} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                          }}
                        >
                          <Icon className="w-3 h-3" style={{ color }} />
                        </div>
                        <span>{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
