/**
 * Navbar.tsx — Phase 3 polish (April 2026)
 *
 * Improvements over previous version:
 *  1. FIX: Sign In / Get Started were going to /sign-in & /sign-up which are NOT registered
 *     routes (404). Now correctly point to /auth?mode=signin and /auth?mode=signup.
 *  2. Logo: emerald gradient orb with soft glow + waveform mark.
 *  3. Scroll-aware: navbar gets darker bg + crisper border + soft shadow once scrolled past 12px.
 *  4. Active link: animated dot indicator below current page link.
 *  5. Get Started: includes ArrowRight icon for clearer affordance.
 *  6. Hamburger: glass-style circular button matching navbar pill aesthetic.
 *  7. Mobile menu: top offset locked to navbar height; smoother enter/exit.
 *  8. Backdrop click & Escape both close mobile menu; body scroll lock retained.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import VoiceifyMark from './VoiceifyMark';

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing',  href: '/pricing'  },
  { label: 'Docs',     href: '/docs'     },
  { label: 'Demo',     href: '/demo'     },
];

export default function Navbar() {
  const location          = useLocation();
  const [open, setOpen]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef           = useRef<HTMLDivElement>(null);

  /* Close on route change */
  useEffect(() => { setOpen(false); }, [location]);

  /* Close on Escape */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  /* Scroll-aware bg + shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Lock body scroll while mobile menu open */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <>
      <nav
        className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}
        id="main-navbar"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* ── Left group: wordmark + primary links ── */}
        <div className="navbar-left">
          <Link to="/" className="navbar-logo" aria-label="Voiceify home" id="nav-logo">
            <span className="navbar-logo-orb" aria-hidden>
              <VoiceifyMark size={17} />
            </span>
            <span className="navbar-logo-text">Voiceify</span>
          </Link>

          <ul className="navbar-links" role="list">
            {NAV_LINKS.map(link => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className={active ? 'active' : ''}
                    id={`nav-link-${link.label.toLowerCase()}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Right actions ── */}
        <div className="navbar-actions">
          <ThemeToggle />
          <Link to="/auth?mode=signin" className="navbar-signin" id="nav-signin-btn">
            Sign in
          </Link>
          <Link to="/auth?mode=signup" className="navbar-cta" id="nav-get-started-btn">
            <span>Get Started</span>
            <ArrowRight className="navbar-cta-icon" strokeWidth={2.25} aria-hidden />
          </Link>
        </div>

        {/* ── Hamburger ── */}
        <button
          className="navbar-hamburger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(prev => !prev)}
          id="nav-hamburger-btn"
        >
          {open ? <X className="w-5 h-5" strokeWidth={2.25} /> : <Menu className="w-5 h-5" strokeWidth={2.25} />}
        </button>
      </nav>

      {/* ── Mobile dropdown ── */}
      <div
        ref={menuRef}
        id="mobile-menu"
        className={`mobile-menu ${open ? 'mobile-menu--open' : ''}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Mobile navigation"
      >
        {/* Backdrop — click to close */}
        <button
          type="button"
          className="mobile-menu-backdrop"
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />

        <div className="mobile-menu-inner">
          <ul className="mobile-links" role="list">
            {NAV_LINKS.map(link => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className={`mobile-link ${isActive(link.href) ? 'active' : ''}`}
                  onClick={() => setOpen(false)}
                  id={`mobile-link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                  <ArrowRight className="mobile-link-arrow" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mobile-divider" aria-hidden="true" />

          <div className="mobile-theme-row">
            <ThemeToggle />
            <span className="mobile-theme-label">Theme</span>
          </div>

          <div className="mobile-ctas">
            <Link
              to="/auth?mode=signin"
              className="btn-ghost mobile-cta-full"
              onClick={() => setOpen(false)}
              id="mobile-signin-btn"
            >
              Sign in
            </Link>
            <Link
              to="/auth?mode=signup"
              className="btn-primary mobile-cta-full"
              onClick={() => setOpen(false)}
              id="mobile-get-started-btn"
            >
              Get Started
              <ArrowRight className="navbar-cta-icon" strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
