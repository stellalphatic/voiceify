/**
 * PublicLayout.tsx — Wraps all public-facing pages.
 * Renders the shared Navbar at the top + Footer at the bottom.
 *
 * Phase 3 (Modern Techy Polish):
 *  • Site-wide ambient backdrop layer (.techy-ambient) — animated dot grid +
 *    drifting blue/violet/cyan orbs. Sits behind every public page at z-index 0.
 *  • Scroll progress bar pinned to the very top of the viewport, driven by a
 *    single requestAnimationFrame loop that updates a CSS variable (cheap).
 *  • Both effects degrade gracefully under `prefers-reduced-motion`
 *    (handled in landing.css).
 */
import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function PublicLayout() {
  const progressRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    let raf = 0;
    let last = -1;

    const update = () => {
      const el = progressRef.current;
      if (el) {
        const doc = document.documentElement;
        const scrollTop = window.scrollY || doc.scrollTop;
        const max = (doc.scrollHeight - window.innerHeight) || 1;
        const pct = Math.min(100, Math.max(0, (scrollTop / max) * 100));
        if (Math.abs(pct - last) > 0.2) {
          el.style.setProperty('--scroll-progress', `${pct}%`);
          last = pct;
        }
      }
      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* Ambient site-wide techy backdrop (pointer-events: none) */}
      <div className="techy-ambient" aria-hidden="true" />

      {/* Scroll progress indicator at the very top */}
      <div
        ref={progressRef}
        className="scroll-progress"
        aria-hidden="true"
      />

      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}
