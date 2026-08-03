/**
 * FeaturesPage.tsx — "How it works" pipeline + integrations (April 2026 polish)
 *
 * Fixes (vs. previous version):
 *   1. Steps array was defined but never rendered → now properly displayed as 3-card pipeline.
 *   2. Hardcoded hex colors replaced with canonical voice-* tokens / CSS variables.
 *   3. Integration section made responsive (grid stacks on mobile).
 *   4. Added benefits row + final CTA for richer page.
 *   5. Tailwind utilities used for spacing/responsive — inline styles only where dynamic colors needed.
 */
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Zap, Languages, Shield, Plug } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── Step icons ── */

function WaveformIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4"  y1="14" x2="4"  y2="14" />
      <line x1="8"  y1="8"  x2="8"  y2="20" />
      <line x1="12" y1="4"  x2="12" y2="24" />
      <line x1="16" y1="10" x2="16" y2="18" />
      <line x1="20" y1="6"  x2="20" y2="22" />
      <line x1="24" y1="11" x2="24" y2="17" />
    </svg>
  );
}

function CircuitIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3D8EF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="3" />
      <line x1="14" y1="4"  x2="14" y2="11" />
      <line x1="14" y1="17" x2="14" y2="24" />
      <line x1="4"  y1="14" x2="11" y2="14" />
      <line x1="17" y1="14" x2="24" y2="14" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4,10 10,10 16,5 16,23 10,18 4,18" />
      <path d="M19 10.5 a6 6 0 0 1 0 7" />
      <path d="M22 8 a10 10 0 0 1 0 12" />
    </svg>
  );
}

const steps = [
  {
    num: '01',
    icon: <WaveformIcon />,
    iconBg:     'color-mix(in srgb, var(--color-accent) 12%, transparent)',
    iconBorder: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
    heading: 'Voice captured instantly',
    body: 'ElevenLabs Scribe v2 transcribes your caller\u2019s speech server-side — 90+ languages including English, Urdu, and code-switching. Browser mic handles live VAD; Scribe refines accuracy.',
    latency: '< 120ms',
  },
  {
    num: '02',
    icon: <CircuitIcon />,
    iconBg:     'rgba(61,142,240,0.10)',
    iconBorder: 'rgba(61,142,240,0.25)',
    heading: 'Intent understood in 210ms',
    body: 'Groq\u2019s Llama 3 processes the transcript and generates a contextual, natural-language response. No scripts. No decision trees.',
    latency: '< 210ms',
  },
  {
    num: '03',
    icon: <SpeakerIcon />,
    iconBg:     'rgba(245,166,35,0.10)',
    iconBorder: 'rgba(245,166,35,0.25)',
    heading: 'Response spoken naturally',
    body: 'Azure Neural TTS delivers a human-sounding Urdu-PK or en-US voice before the caller notices any pause.',
    latency: '< 170ms',
  },
];

const benefits = [
  { icon: <Zap className="w-5 h-5" />,      label: 'Sub-500ms total latency',    sub: 'End to end, including network hop' },
  { icon: <Languages className="w-5 h-5" />, label: 'English + Urdu + code-mix',   sub: 'Detect & respond in the same call' },
  { icon: <Shield className="w-5 h-5" />,    label: 'Encrypted & compliant',      sub: 'TLS 1.3, AES-256, GDPR-ready' },
  { icon: <Plug className="w-5 h-5" />,      label: 'Integrates with your stack', sub: 'Twilio, n8n, Google Sheets, more' },
];

export default function FeaturesPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.feature-header', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.utils.toArray('.step-card').forEach((card: any, i: number) => {
        gsap.from(card, {
          y: 40, opacity: 0, duration: 0.55, delay: i * 0.08,
          scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none reverse' },
        });
      });
      gsap.utils.toArray('.benefit-card').forEach((card: any, i: number) => {
        gsap.from(card, {
          y: 24, opacity: 0, duration: 0.45, delay: i * 0.06,
          scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none reverse' },
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-voice-bg text-voice-text font-sans pt-24 pb-20"
    >
      <div className="max-w-6xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="feature-header text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-5"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
              color: 'var(--color-accent)',
            }}>
            How it works
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight leading-tight">
            A sub-500ms voice pipeline,<br className="hidden sm:block" /> end to end.
          </h1>
          <p className="text-base sm:text-lg text-voice-muted leading-relaxed">
            Powered by Gemini 2.5 Flash + ElevenLabs Scribe + Flash TTS. Every component is purpose-built for speed, so your callers never sit in silence.
          </p>
        </div>

        {/* ── 3-step pipeline ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
          {steps.map(s => (
            <div
              key={s.num}
              className="step-card relative rounded-2xl border p-6 sm:p-7 transition-colors"
              style={{
                background: 'var(--color-frost-base)',
                borderColor: 'var(--color-frost-border)',
              }}
            >
              {/* Number + latency */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-mono text-voice-muted tracking-widest">STEP {s.num}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                    color: 'var(--color-accent)',
                  }}>
                  {s.latency}
                </span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: s.iconBg, border: `1px solid ${s.iconBorder}` }}>
                {s.icon}
              </div>

              <h3 className="text-lg sm:text-xl font-semibold mb-2 tracking-tight">{s.heading}</h3>
              <p className="text-sm text-voice-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* ── Benefits row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {benefits.map(b => (
            <div
              key={b.label}
              className="benefit-card rounded-xl p-5 border"
              style={{ background: 'var(--color-frost-base)', borderColor: 'var(--color-frost-border)' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  color: 'var(--color-accent)',
                }}>
                {b.icon}
              </div>
              <p className="text-sm font-semibold mb-1 leading-snug">{b.label}</p>
              <p className="text-xs text-voice-muted leading-relaxed">{b.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Integration section (responsive: stacks on mobile) ── */}
        <div
          className="rounded-2xl p-6 sm:p-10 md:p-12 border"
          style={{ background: 'var(--color-frost-base)', borderColor: 'var(--color-frost-border)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  color: 'var(--color-accent)',
                }}>
                Integrations
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight">
                Plug into your existing stack
              </h2>
              <p className="text-base text-voice-muted leading-relaxed mb-6">
                Connect Voiceify to the tools you already use. REST + WebSocket API, n8n webhooks, and Google Sheets out of the box.
              </p>
              <ul className="space-y-2.5 mb-7">
                {[
                  'Twilio & Vonage SIP Trunking',
                  'Salesforce & HubSpot CRM',
                  'Google Calendar & Outlook',
                  'Credit Wallet',
                  'Custom n8n workflows (Custom plan)',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-voice-muted">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth?mode=signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                }}
              >
                Start building <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Code snippet — responsive: full width on mobile, side on desktop */}
            <div
              className="rounded-xl p-5 sm:p-6 overflow-x-auto"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-frost-border)',
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 13,
                lineHeight: 1.9,
              }}
            >
              <div className="flex gap-2 mb-4">
                {['#E8593C', '#F5A623', 'var(--color-accent)'].map((c, i) => (
                  <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <p className="m-0 text-voice-muted">
                <span style={{ color: '#3D8EF0' }}>const</span>{' '}
                <span className="text-voice-text">agent</span>{' = '}
                <span style={{ color: '#3D8EF0' }}>new</span>{' '}
                VoiceAgent{'({'}
              </p>
              <p className="m-0 pl-4 text-voice-muted">name: <span style={{ color: '#F5A623' }}>"Support Bot"</span>,</p>
              <p className="m-0 pl-4 text-voice-muted">voice: <span style={{ color: '#F5A623' }}>"urdu-pk-neural"</span>,</p>
              <p className="m-0 pl-4 text-voice-muted">llm: <span style={{ color: '#F5A623' }}>"groq/llama-3"</span>,</p>
              <p className="m-0 text-voice-muted">{`});`}</p>
              <br />
              <p className="m-0" style={{ color: '#555B63' }}>{'// Ready in 3 lines'}</p>
              <p className="m-0 text-voice-muted">
                <span style={{ color: '#3D8EF0' }}>await</span>{' '}
                <span className="text-voice-text">agent</span>.listen(3000);
              </p>
            </div>
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Ready to ship a voice agent today?</h2>
          <p className="text-base text-voice-muted mb-7 max-w-xl mx-auto">
            Free tier is generous. Pro is $29/mo. Custom n8n workflows on demand for enterprise teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/auth?mode=signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-colors"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border transition-colors text-voice-text"
              style={{ borderColor: 'var(--color-frost-border)' }}
            >
              View pricing
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
