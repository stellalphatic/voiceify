/**
 * AboutPage.tsx — Phase 1 Polish (April 2026)
 * Modern hero + mission + stats + values + team CTA.
 * Fully responsive, uses voice-* tokens.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Globe2, Shield, Heart } from 'lucide-react';

const VALUES = [
  {
    Icon: Zap,
    title: 'Speed by design',
    desc: 'Every millisecond matters in conversation. We optimise the entire stack for sub-500ms responses.',
  },
  {
    Icon: Globe2,
    title: 'Built for the world',
    desc: '40+ languages, automatic language identification, and culturally-aware personas — out of the box.',
  },
  {
    Icon: Shield,
    title: 'Trust over hype',
    desc: 'SOC 2 audited, transparent pricing, no vendor lock-in. Your data and your customers come first.',
  },
  {
    Icon: Heart,
    title: 'People-first AI',
    desc: 'AI should amplify humans, not replace them. We design agents that escalate gracefully and respect users.',
  },
];

const STATS = [
  { value: '10M+',     label: 'Minutes processed' },
  { value: '99.9%',    label: 'Uptime SLA' },
  { value: '< 500ms',  label: 'Average latency' },
  { value: '40+',      label: 'Languages supported' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-voice-bg text-voice-text font-sans selection:bg-voice-accent selection:text-voice-on-accent">

      {/* ─── Hero ─────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        {/* Subtle accent glow */}
        <div
          aria-hidden
          className="absolute top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 12%, transparent) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
              color: 'var(--color-accent)',
            }}>
            About Voiceify
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-[1.05] tracking-tight">
            Voice AI that earns the moment of trust.
          </h1>
          <p className="text-lg sm:text-xl text-voice-muted max-w-2xl mx-auto leading-relaxed">
            We&apos;re on a mission to make every business call feel like the best human you&apos;ve ever spoken to —
            fast, multilingual, and never on hold.
          </p>
        </div>
      </section>

      {/* ─── Stats Strip ───────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-voice-frost-border bg-voice-frost-border">
          {STATS.map(({ value, label }) => (
            <div key={label} className="bg-voice-surface px-6 py-8 text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2 tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>{value}</div>
              <div className="text-xs uppercase tracking-wider text-voice-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Story ─────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 tracking-tight">Our story</h2>
          <div className="space-y-5 text-voice-muted leading-relaxed text-base md:text-lg">
            <p>
              Voiceify started with a simple frustration. Existing voice assistants were too slow,
              too robotic, and too narrow to be useful for real businesses. Customers heard awkward pauses,
              broken English, and felt like they were talking to a phone tree from 2008.
            </p>
            <p>
              So we rebuilt the voice stack from scratch. We obsessed over latency at every layer —
              speech-to-text, LLM inference, text-to-speech — and tuned each one to work in concert.
              The result is a sub-500ms response time that finally feels like a conversation, not a transaction.
            </p>
            <p>
              Today we power voice agents for restaurants taking reservations, dental clinics setting appointments,
              and customer-care teams resolving issues across three continents. Built for SMBs, ready for enterprise scale.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Values ────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight">What we believe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VALUES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="group p-7 rounded-2xl bg-voice-surface border border-voice-frost-border hover:border-voice-accent/40 transition-all"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-105"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-voice-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div
          className="max-w-4xl mx-auto rounded-3xl border border-voice-frost-border p-10 md:p-14 text-center"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 5%, var(--color-bg-secondary)) 0%, var(--color-bg-secondary) 100%)',
          }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Want to build with us?</h2>
          <p className="text-voice-muted mb-7 max-w-xl mx-auto leading-relaxed">
            We&apos;re hiring across engineering, research, design, and developer relations. Or just say hi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/careers" className="btn-primary-lg">View open roles</Link>
            <Link to="/contact" className="btn-ghost-lg">Get in touch</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
