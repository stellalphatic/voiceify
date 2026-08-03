/**
 * PricingPage.tsx — Phase 1 Revamp (April 2026)
 * Four tiers aligned with FYP scope:
 *   Free  · Pro  · Enterprise  · Custom (n8n workflows)
 *
 * Preserves existing dark-theme look (Voiceify VoltAgent palette).
 * Pure tokens from index.css/landing.css — fully responsive (4 → 2 → 1 columns).
 */

import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────
   Color tokens (read from canonical CSS variables)
───────────────────────────────────────────── */
const TOKEN = {
  accent:      'var(--color-accent)',
  accentHover: 'var(--color-accent-hover)',
  accentFaint: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
  amber:       'var(--accent-fast)',
  amberFaint:  'color-mix(in srgb, var(--accent-fast) 15%, transparent)',
  bgCard:      'var(--color-bg-card)',
  bgCardHover: 'var(--color-bg-card-hover)',
  border:      'var(--color-border)',
  borderStrong:'var(--color-border-strong)',
  textPrimary: 'var(--color-text-primary)',
  textSec:     'var(--color-text-secondary)',
  textMuted:   'var(--color-text-muted)',
};

/* ─────────────────────────────────────────────
   SVG: green checkmark (uses currentColor for theme)
───────────────────────────────────────────── */
const CheckIcon: React.FC<{ accent?: string }> = ({ accent = TOKEN.accent }) => (
  <svg
    width="16" height="16" viewBox="0 0 16 16" fill="none"
    aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}
  >
    <circle cx="8" cy="8" r="8" fill={`color-mix(in srgb, ${accent} 18%, transparent)`} />
    <path d="M4.5 8.5 L7 11 L11.5 5.5" stroke={accent}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* Compact grey check for trust badges */
const BadgeCheckIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
       aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx="7" cy="7" r="7"
            fill="color-mix(in srgb, var(--color-text-muted) 18%, transparent)" />
    <path d="M4 7.5 L6 9.5 L10 5"
          stroke="var(--color-text-muted)"
          strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─────────────────────────────────────────────
   Feature list item
───────────────────────────────────────────── */
const Feature: React.FC<{ text: string; accent?: string }> = ({ text, accent }) => (
  <li
    style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      color: TOKEN.textPrimary, fontSize: 14, lineHeight: 1.6,
    }}
  >
    <CheckIcon accent={accent} />
    <span>{text}</span>
  </li>
);

/* ─────────────────────────────────────────────
   CTA button
───────────────────────────────────────────── */
type CtaVariant = 'primary' | 'ghost';
const CtaButton: React.FC<{
  label: string; href: string; variant?: CtaVariant;
}> = ({ label, href, variant = 'primary' }) => {
  const [hovered, setHovered] = useState(false);
  const isPrimary = variant === 'primary';
  const s: CSSProperties = {
    display: 'block', width: '100%', padding: '13px 0',
    background: isPrimary
      ? (hovered ? TOKEN.accentHover : TOKEN.accent)
      : (hovered ? TOKEN.bgCardHover : 'transparent'),
    color: isPrimary ? 'var(--color-voice-on-accent, #ffffff)' : TOKEN.textPrimary,
    fontFamily: "var(--font-ui, 'Inter', sans-serif)",
    fontSize: 15, fontWeight: 500, textAlign: 'center',
    borderRadius: 9999,
    border: isPrimary ? 'none' : `1px solid ${TOKEN.borderStrong}`,
    cursor: 'pointer', textDecoration: 'none',
    transition: 'background 0.18s ease, transform 0.15s ease, border-color 0.18s ease',
    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: isPrimary && hovered
      ? '0 6px 20px color-mix(in srgb, var(--color-accent) 30%, transparent)'
      : 'none',
  };
  return (
    <Link
      to={href} style={s}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      id={`cta-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {label}
    </Link>
  );
};

/* ─────────────────────────────────────────────
   Pricing card
───────────────────────────────────────────── */
type Highlight = 'none' | 'popular' | 'enterprise' | 'custom';

interface CardProps {
  tierName:   string;
  tagline:    string;
  price:      string;
  priceUnit?: string;
  yearLabel?: string;
  badge?:     string;
  highlight:  Highlight;
  features:   string[];
  ctaLabel:   string;
  ctaHref:    string;
  ctaVariant?: CtaVariant;
}

const PricingCard: React.FC<CardProps> = ({
  tierName, tagline, price, priceUnit, yearLabel, badge,
  highlight, features, ctaLabel, ctaHref, ctaVariant = 'primary',
}) => {
  const isPopular  = highlight === 'popular';
  const isCustom   = highlight === 'custom';
  const isEnt      = highlight === 'enterprise';
  const accentColor = isCustom ? TOKEN.amber : TOKEN.accent;

  const s: CSSProperties = {
    position: 'relative',
    background: isPopular ? TOKEN.bgCardHover : TOKEN.bgCard,
    border: isPopular
      ? `1px solid color-mix(in srgb, ${TOKEN.accent} 35%, ${TOKEN.borderStrong})`
      : isCustom
      ? `1px solid color-mix(in srgb, ${TOKEN.amber} 28%, ${TOKEN.borderStrong})`
      : `1px solid ${TOKEN.border}`,
    borderRadius: 16,
    padding: '36px 28px 32px',
    display: 'flex', flexDirection: 'column',
    boxShadow: isPopular || isCustom
      ? '0 4px 16px rgba(12, 10, 9, 0.06)'
      : '0 1px 2px rgba(12, 10, 9, 0.03)',
  };

  return (
    <article style={s} aria-label={`${tierName} pricing tier`}>
      {/* Top badge */}
      {badge && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: isPopular ? TOKEN.accent : TOKEN.amber,
          color: 'var(--color-voice-on-accent, #ffffff)',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap',
          fontFamily: "var(--font-ui, 'Inter', sans-serif)",
        }}>
          {badge}
        </div>
      )}

      {/* Tier name */}
      <p style={{
        fontFamily: "var(--font-ui, 'Inter', sans-serif)",
        fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: isPopular ? TOKEN.accent : isCustom ? TOKEN.amber : TOKEN.textSec,
        marginBottom: 8,
      }}>
        {tierName}
      </p>

      {/* Tagline */}
      <p style={{
        fontFamily: "var(--font-ui, 'Inter', sans-serif)",
        fontSize: 13.5, color: TOKEN.textSec,
        margin: '0 0 20px', lineHeight: 1.5, minHeight: 38,
      }}>
        {tagline}
      </p>

      {/* Price */}
      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
        <span style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: price.length > 6 ? 28 : 42, fontWeight: 500,
          color: TOKEN.textPrimary, lineHeight: 1,
        }}>
          {price}
        </span>
        {priceUnit && (
          <span style={{
            fontFamily: "var(--font-ui, 'Inter', sans-serif)",
            fontSize: 14, color: TOKEN.textSec,
          }}>
            {priceUnit}
          </span>
        )}
      </div>

      {/* Year sub-label or contact note */}
      <p style={{
        fontFamily: "var(--font-ui, 'Inter', sans-serif)",
        fontSize: 12.5, color: TOKEN.textMuted,
        marginBottom: 24, minHeight: 18,
      }}>
        {yearLabel || ' '}
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: TOKEN.border, marginBottom: 22 }} />

      {/* Feature list */}
      <ul style={{
        listStyle: 'none', padding: 0, margin: 0,
        display: 'flex', flexDirection: 'column',
        gap: 11, flexGrow: 1, marginBottom: 28,
      }}>
        {features.map((f) => (
          <Feature key={f} text={f} accent={accentColor} />
        ))}
      </ul>

      {/* CTA */}
      <CtaButton label={ctaLabel} href={ctaHref} variant={ctaVariant} />
    </article>
  );
};

/* ─────────────────────────────────────────────
   Trust badge pill
───────────────────────────────────────────── */
const TrustBadge: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px',
      background: 'color-mix(in srgb, var(--color-text-primary) 4%, transparent)',
      border: `1px solid ${TOKEN.border}`,
      borderRadius: 20, fontSize: 13, color: TOKEN.textSec,
      fontFamily: "var(--font-ui, 'Inter', sans-serif)", whiteSpace: 'nowrap',
    }}
  >
    <BadgeCheckIcon />
    {label}
  </div>
);

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function PricingPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }, []);

  const freeFeatures = [
    '100 minutes/month, no card required',
    '1 ready-made agent persona',
    'English + Urdu bilingual support',
    'Browser WebRTC sandbox',
    'Google Sheets call logging',
    'Community support',
  ];

  const proFeatures = [
    'Unlimited calls',
    'All 3 personas (Restaurant, Dental, Customer Care)',
    '40+ language auto-detection',
    'n8n webhook automation',
    'Real-time analytics & call logs',
    'Priority email support (4h response)',
    'Custom voice & branding',
  ];

  const enterpriseFeatures = [
    'Everything in Pro',
    'Volume-based discount pricing',
    'Dedicated account manager',
    '99.99% uptime SLA',
    'On-premise / VPC deployment',
    'SOC 2 + HIPAA compliance options',
    'Single sign-on (SSO / SAML)',
    'Dedicated Slack channel',
  ];

  const customFeatures = [
    'Bespoke n8n workflows built by us',
    'Dedicated automation architect',
    'Custom integrations (CRM / EHR / POS)',
    'White-label deployment options',
    'End-to-end implementation',
    'Ongoing workflow maintenance',
    'Custom training & runbooks',
  ];

  return (
    <div className="pricing-page-root" ref={pageRef}>
      <div className="pricing-page-inner">

        {/* ── Heading ── */}
        <div className="pricing-page-header">
          <span className="pricing-page-eyebrow">Pricing</span>
          <h1 className="pricing-page-title">Plans for every stage of growth.</h1>
          <p className="pricing-page-sub">
            Start free, scale with your business, or get a fully custom n8n workflow built and delivered by our team.
          </p>
        </div>

        {/* ── Pricing grid ── */}
        <div className="pricing-grid">
          <PricingCard
            tierName="Free"
            tagline="For solo founders and side projects testing the waters."
            price="$0"
            priceUnit="/month"
            yearLabel="Forever free — no card required"
            highlight="none"
            features={freeFeatures}
            ctaLabel="Start free"
            ctaHref="/auth?mode=signup"
            ctaVariant="ghost"
          />

          <PricingCard
            tierName="Pro"
            tagline="For SMBs running daily operations on voice AI."
            price="$149"
            priceUnit="/month"
            yearLabel="or $1,430/year — save 20%"
            badge="Most Popular"
            highlight="popular"
            features={proFeatures}
            ctaLabel="Start free trial"
            ctaHref="/auth?mode=signup"
          />

          <PricingCard
            tierName="Enterprise"
            tagline="For larger organisations with compliance and scale needs."
            price="Custom"
            yearLabel="Volume + SLA + on-prem options"
            highlight="enterprise"
            features={enterpriseFeatures}
            ctaLabel="Talk to sales"
            ctaHref="/contact"
            ctaVariant="ghost"
          />

          <PricingCard
            tierName="Custom"
            tagline="Custom n8n workflows designed and delivered by Voiceify."
            price="Quote"
            yearLabel="Project-based engagement"
            badge="n8n Workflows"
            highlight="custom"
            features={customFeatures}
            ctaLabel="Request a quote"
            ctaHref="/contact"
            ctaVariant="ghost"
          />
        </div>

        {/* ── Comparison link ── */}
        <div className="pricing-compare-row">
          <p className="pricing-compare-text">Need help choosing?</p>
          <Link to="/contact" id="enterprise-sales-link" className="pricing-compare-link">
            Talk to our team
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8M8 4l3 3-3 3"
                    stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* ── Trust badges ── */}
        <div className="pricing-trust-row">
          <TrustBadge label="SOC 2 Type II" />
          <TrustBadge label="No credit card required" />
          <TrustBadge label="Cancel anytime" />
          <TrustBadge label="GDPR ready" />
        </div>
      </div>

      {/* Page-scoped styles for responsive grid */}
      <style>{`
        .pricing-page-root {
          min-height: 100vh;
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          font-family: var(--font-ui, 'Inter', sans-serif);
        }
        .pricing-page-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 96px 24px 96px;
        }
        .pricing-page-header {
          text-align: center;
          margin-bottom: 56px;
        }
        .pricing-page-eyebrow {
          display: inline-block;
          padding: 0;
          border-radius: 0;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .pricing-page-title {
          font-family: var(--font-display, 'Inter Tight', sans-serif);
          font-size: clamp(2.1rem, 4.5vw, 3.1rem);
          font-weight: 500;
          color: var(--color-text-primary);
          margin: 0 0 16px;
          line-height: 1.08;
          letter-spacing: -0.03em;
        }
        .pricing-page-sub {
          font-size: 1rem;
          color: var(--color-text-secondary);
          margin: 0 auto;
          max-width: 620px;
          line-height: 1.65;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          align-items: stretch;
          margin-bottom: 48px;
        }
        @media (max-width: 1100px) {
          .pricing-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
        }
        @media (max-width: 600px) {
          .pricing-grid { grid-template-columns: 1fr; }
          .pricing-page-inner { padding: 72px 16px 80px; }
        }
        .pricing-compare-row {
          text-align: center;
          margin-bottom: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .pricing-compare-text {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .pricing-compare-link {
          color: var(--color-accent);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.15s ease;
        }
        .pricing-compare-link:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .pricing-trust-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}
