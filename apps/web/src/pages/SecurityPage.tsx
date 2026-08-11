/**
 * SecurityPage.tsx — Phase 1 Polish (April 2026)
 * Hero + compliance grid + practices list + CTA.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Key, FileText, Eye, Server, ArrowRight, Check, Clock } from 'lucide-react';

/** Shipped controls only. Anything not yet built belongs in ROADMAP below. */
const COMPLIANCE = [
  {
    Icon:  Lock,
    title: 'Encrypted in transit and at rest',
    desc:  'TLS for every request, AES-256 for stored data and recordings.',
  },
  {
    Icon:  Key,
    title: 'Role-based access control',
    desc:  'Owner, admin, and member roles enforced on every workspace API route.',
  },
  {
    Icon:  Server,
    title: 'Server-side provider keys',
    desc:  'Speech and LLM credentials stay on our servers and are never exposed to the browser.',
  },
  {
    Icon:  Shield,
    title: 'Abuse and SSRF protection',
    desc:  'Rate limiting on public endpoints, and outbound HTTP tools blocked from internal networks.',
  },
  {
    Icon:  FileText,
    title: 'Data export on demand',
    desc:  'Download a machine-readable snapshot of your workspace data at any time.',
  },
  {
    Icon:  Eye,
    title: 'Tenant isolation',
    desc:  'Every record is scoped to your organization and checked on each request.',
  },
];

const PRACTICES = [
  'Provider API keys are held server-side and never shipped to the client.',
  'Outbound tool requests are blocked from reaching internal or private network ranges.',
  'Public endpoints are rate limited per IP.',
  'Incident response runbooks are maintained in our operations documentation.',
  'You can export or delete your workspace data from the dashboard.',
];

/** Named separately so roadmap items are never read as already certified. */
const ROADMAP = [
  {
    title: 'SOC 2 Type II',
    desc: 'A formal control programme and independent Type II assessment are on the roadmap. Voiceify does not hold a SOC 2 report today.',
  },
  {
    title: 'HIPAA readiness',
    desc: 'Operational controls and a BAA process are planned. Voiceify cannot sign a BAA today.',
  },
  {
    title: 'GDPR programme',
    desc: 'Workspace data export ships today; automated erasure SLAs and a formal DPA register are next on the roadmap.',
  },
  {
    title: 'SSO (SAML / OIDC)',
    desc: 'Enterprise single sign-on is planned for teams that need IdP-backed access control.',
  },
  {
    title: 'VPC and private deployment',
    desc: 'Dedicated network and on-premise options are on the enterprise roadmap for regulated environments.',
  },
  {
    title: 'Independent assurance',
    desc: 'Third-party penetration testing and an immutable audit log are planned as part of our assurance programme.',
  },
  {
    title: 'Telephony (PSTN / SIP)',
    desc: 'Voiceify runs in the browser today; PSTN and SIP connectivity are future channel expansions.',
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-voice-bg text-voice-text font-sans selection:bg-voice-accent selection:text-voice-on-accent pt-28 pb-20">

      {/* ── Hero ── */}
      <div className="relative max-w-4xl mx-auto px-6 text-center mb-20">
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[480px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 10%, transparent) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
              color: 'var(--color-accent)',
            }}>
            <Shield className="w-3.5 h-3.5" />
            Security
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-5 leading-[1.05] tracking-tight">
            Security you can inspect, with a clear compliance roadmap.
          </h1>
          <p className="text-lg text-voice-muted max-w-2xl mx-auto leading-relaxed">
            Voice is some of the most sensitive data your customers will ever share. Here is what protects
            every workspace today, and how our compliance programme is progressing for enterprise buyers.
          </p>
        </div>
      </div>

      {/* ── Compliance grid ── */}
      <div className="max-w-6xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {COMPLIANCE.map(({ Icon, title, desc }) => (
            <div key={title} className="p-7 rounded-2xl bg-voice-surface border border-voice-frost-border hover:border-voice-accent/30 transition-colors">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                }}
              >
                <Icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="text-base font-bold mb-2">{title}</h3>
              <p className="text-sm text-voice-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Practices list ── */}
      <div className="max-w-3xl mx-auto px-6 mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 tracking-tight">How we operate today</h2>
        <ul className="space-y-3.5">
          {PRACTICES.map((p, i) => (
            <li key={i} className="flex items-start gap-3 text-base text-voice-muted leading-relaxed">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
                }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              </div>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Compliance roadmap ── */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Compliance roadmap</h2>
        <p className="text-voice-muted mb-8 leading-relaxed">
          These are planned capabilities, not current certifications. Voiceify does not hold a SOC 2
          report or offer a HIPAA BAA today. We publish the roadmap so procurement teams can evaluate
          the product against what is available now.
        </p>
        <ul className="space-y-4">
          {ROADMAP.map(({ title, desc }) => (
            <li key={title} className="flex items-start gap-3 text-base leading-relaxed">
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border border-voice-frost-border bg-voice-surface">
                <Clock className="w-3.5 h-3.5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-voice-text mb-0.5">{title}</p>
                <p className="text-voice-muted m-0">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── CTA ── */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="rounded-3xl border border-voice-frost-border p-8 md:p-10 text-center"
             style={{
               background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 5%, var(--color-bg-secondary)) 0%, var(--color-bg-secondary) 100%)',
             }}>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Questions about our security posture?</h2>
          <p className="text-voice-muted mb-6 leading-relaxed">
            We are happy to walk through our architecture, our data handling, and where a control you
            need sits on the roadmap.
          </p>
          <Link to="/contact" className="btn-primary-lg inline-flex items-center gap-2">
            Talk to security <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
