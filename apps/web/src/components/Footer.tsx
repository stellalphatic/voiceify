import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Github, Linkedin, ArrowUp } from 'lucide-react';

const NAV_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Demo', to: '/demo' },
      { label: 'Docs', to: '/docs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Blog', to: '/blog' },
      { label: 'Careers', to: '/careers' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
      { label: 'Security', to: '/security' },
      { label: 'Cookies', to: '/cookies' },
    ],
  },
];

const SOCIALS = [
  { Icon: Twitter, label: 'Twitter', href: '#' },
  { Icon: Github, label: 'GitHub', href: '#' },
  { Icon: Linkedin, label: 'LinkedIn', href: '#' },
];

export default function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="footer-techy footer-techy--minimal">
      <div className="max-w-7xl mx-auto px-6 relative z-[1]">
        <div className="footer-main-grid footer-main-grid--minimal">
          <div className="footer-brand-block">
            <Link to="/" className="footer-brand-link">
              <span className="footer-brand-name">Voiceify</span>
            </Link>
            <p className="footer-brand-tagline">
              Voice agents for missed calls, bookings, and support — when your team is busiest.
            </p>
            <div className="footer-socials">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a key={label} href={href} aria-label={label} className="footer-social-pill">
                  <Icon className="w-4 h-4" strokeWidth={2.25} />
                </a>
              ))}
            </div>
          </div>

          {NAV_COLS.map((col) => (
            <div key={col.title} className="footer-nav-col">
              <p className="footer-nav-title">{col.title}</p>
              <ul className="footer-nav-list">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="footer-nav-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom footer-bottom--minimal">
          <p className="footer-copy">© 2026 Voiceify</p>
          <button
            type="button"
            onClick={scrollTop}
            className="footer-back-to-top"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </footer>
  );
}
