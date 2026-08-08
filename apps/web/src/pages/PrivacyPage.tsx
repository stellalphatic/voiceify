/**
 * PrivacyPage.tsx — Phase 1 Polish (April 2026)
 * Uses shared LegalPageLayout for consistent typography + ToC.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import LegalPageLayout, { LegalSection } from '../components/LegalPageLayout';

const SECTIONS: LegalSection[] = [
  {
    id: 'collection',
    title: '1. Information we collect',
    body: (
      <>
        <p>We collect information you provide directly to us, such as when you:</p>
        <ul>
          <li>Create an account or sign up for our services</li>
          <li>Subscribe to our newsletter or product updates</li>
          <li>Contact us for support, sales, or partnership inquiries</li>
          <li>Configure agents, voice clones, or workflows</li>
        </ul>
        <p>We also automatically collect technical data (IP, browser, OS) and usage analytics to maintain service quality.</p>
      </>
    ),
  },
  {
    id: 'usage',
    title: '2. How we use your information',
    body: (
      <>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our voice AI services</li>
          <li>Develop new features and personas</li>
          <li>Communicate with you about your account, security, and product updates</li>
          <li>Detect and prevent fraud, abuse, and security incidents</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>We never sell your personal information or call recordings to third parties.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: '3. Data security',
    body: (
      <>
        <p>
          We implement appropriate technical and organisational measures to protect your personal information,
          including encryption in transit and at rest, role-based access controls, and workspace-level data
          isolation. Independent penetration testing and immutable audit logging are on our roadmap and are
          not in place today.
        </p>
        <p>
          For more details on our security practices, see our <Link to="/security">Security page</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: '4. Sharing and disclosure',
    body: (
      <>
        <p>
          We share information only with sub-processors strictly required to deliver the service (cloud hosting,
          payment processing, email delivery, analytics, and speech and language model providers).
        </p>
        <p>
          A current list of sub-processors is available on request from <Link to="/contact">our contact page</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'rights',
    title: '5. Your rights',
    body: (
      <>
        <p>Depending on your jurisdiction, you have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate or incomplete data</li>
          <li>Request deletion of your data ("right to be forgotten")</li>
          <li>Export your data in a portable format</li>
          <li>Object to or restrict certain types of processing</li>
        </ul>
        <p>To exercise these rights, email <a href="mailto:privacy@voiceify.ai">privacy@voiceify.ai</a>.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: '6. Data retention',
    body: (
      <>
        <p>
          We retain your information for as long as your account is active or as needed to provide the service.
          Call recordings and transcripts are retained per your plan settings (default: 30 days, configurable).
          On account deletion, we purge personal data within 30 days, with a 90-day grace period for billing records.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: '7. Contact',
    body: (
      <>
        <p>
          If you have questions about this policy, please email <a href="mailto:privacy@voiceify.ai">privacy@voiceify.ai</a> or
          visit our <Link to="/contact">contact page</Link>.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Privacy Policy"
      intro="We collect the minimum data needed to deliver Voiceify, secure it carefully, and never sell it. This policy explains the details — in plain English."
      lastUpdated="April 26, 2026"
      sections={SECTIONS}
    />
  );
}
