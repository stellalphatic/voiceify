/**
 * CookiesPage.tsx — Phase 1 Polish (April 2026)
 */
import React from 'react';
import { Link } from 'react-router-dom';
import LegalPageLayout, { LegalSection } from '../components/LegalPageLayout';

const SECTIONS: LegalSection[] = [
  {
    id: 'what',
    title: '1. What are cookies?',
    body: (
      <>
        <p>
          Cookies are small text files placed on your device when you visit a website. They help the site
          remember your preferences, keep you signed in, and understand how visitors use the site.
        </p>
        <p>
          Similar technologies — local storage, session storage, and pixel tags — are covered by this policy too.
        </p>
      </>
    ),
  },
  {
    id: 'types',
    title: '2. Types of cookies we use',
    body: (
      <>
        <p>We use four categories of cookies:</p>
        <ul>
          <li>
            <strong>Strictly necessary</strong> — required for the site to function (authentication, security, load
            balancing). These cannot be disabled.
          </li>
          <li>
            <strong>Functional</strong> — remember your preferences (theme, language, dashboard layout).
          </li>
          <li>
            <strong>Analytics</strong> — help us understand how visitors use the site so we can improve it.
            Uses privacy-friendly tools that don&apos;t track you across other websites.
          </li>
          <li>
            <strong>Marketing</strong> — only set with your explicit consent. Used to measure ad campaign performance.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'manage',
    title: '3. Managing cookies',
    body: (
      <>
        <p>
          You can control and delete cookies using your browser settings. Most browsers let you block all cookies,
          delete existing cookies, or get notified before cookies are set.
        </p>
        <p>
          Note: blocking strictly necessary cookies will prevent core functionality (sign-in, dashboard) from working.
        </p>
        <p>
          You can also adjust your cookie preferences at any time via the cookie banner that appears on your first
          visit (or by clearing site data and re-visiting).
        </p>
      </>
    ),
  },
  {
    id: 'thirdparty',
    title: '4. Third-party cookies',
    body: (
      <>
        <p>
          Some pages embed third-party content (videos, demos, payment forms) that may set their own cookies.
          We carefully vet partners and link only to providers with strong privacy practices.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: '5. Contact',
    body: (
      <p>
        Questions about cookies? See our <Link to="/privacy">Privacy Policy</Link> or
        email <a href="mailto:privacy@voiceify.ai">privacy@voiceify.ai</a>.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Cookie Policy"
      intro="A short, clear explanation of how Voiceify uses cookies and similar technologies — and how to control them."
      lastUpdated="April 26, 2026"
      sections={SECTIONS}
    />
  );
}
