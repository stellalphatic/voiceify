/**
 * SecurityPage.tsx — Phase 1 Polish (April 2026)
 * Hero + compliance grid + practices list + CTA.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Key, FileText, Eye, Server, ArrowRight, Check } from 'lucide-react';

const COMPLIANCE = [
  {
    Icon:  Shield,
    title: 'SOC 2 Type II',
    desc:  'Independently audited annually for security, availability, and confidentiality.',
  },
  {
    Icon:  Lock,
    title: 'End-to-end encryption',
    desc:  'TLS 1.3 in transit · AES-256 at rest. Keys rotated automatically every 90 days.',
  },
  {
    Icon:  Key,
    title: 'RBAC + SSO',
    desc:  'Role-based access control with SAML SSO support for enterprise teams.',
  },
  {
    Icon:  FileText,
    title: 'GDPR + CCPA ready',
    desc:  'Data residency options, right-to-delete tooling, and DPA templates available on request.',
  },
  {
    Icon:  Eye,
    title: 'Continuous monitoring',
    desc:  '24/7 SIEM, anomaly detection, and DDoS protection at the edge.',
  },
  {
    Icon:  Server,
    title: 'Isolated environments',
    desc:  'Multi-tenant by default · single-tenant VPC and on-premise options for enterprise.',
  },
];

const PRACTICES = [
  'Penetration tests run twice a year by independent auditors.',
  'Annual security training for every employee, refresher quarterly.',
  'Strict least-privilege access — engineers cannot read customer data without explicit, audited approval.',
  'Bug bounty program with public disclosure timeline.',
  'Incident response runbooks and customer notification within 24h of confirmed incidents.',
  'PII redaction available at the transcript layer for sensitive deployments.',
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
            Security is the product.
          </h1>
          <p className="text-lg text-voice-muted max-w-2xl mx-auto leading-relaxed">
            Voiceify is built with enterprise-grade controls from day one — because handling voice means handling
            some of the most sensitive data your customers will ever share.
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
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 tracking-tight">How we operate</h2>
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

      {/* ── CTA ── */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="rounded-3xl border border-voice-frost-border p-8 md:p-10 text-center"
             style={{
               background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 5%, var(--color-bg-secondary)) 0%, var(--color-bg-secondary) 100%)',
             }}>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Need a SOC 2 report or DPA?</h2>
          <p className="text-voice-muted mb-6 leading-relaxed">
            Available on request for prospective and existing customers under NDA.
          </p>
          <Link to="/contact" className="btn-primary-lg inline-flex items-center gap-2">
            Talk to security <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
