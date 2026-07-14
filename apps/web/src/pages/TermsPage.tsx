/**
 * TermsPage.tsx — Phase 1 Polish (April 2026)
 */
import React from 'react';
import { Link } from 'react-router-dom';
import LegalPageLayout, { LegalSection } from '../components/LegalPageLayout';

const SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of terms',
    body: (
      <p>
        By accessing or using Voiceify, you agree to be bound by these Terms. If you do not agree, you may not use
        the services. If you are using Voiceify on behalf of an organisation, you represent that you have the
        authority to bind that organisation.
      </p>
    ),
  },
  {
    id: 'use',
    title: '2. Acceptable use',
    body: (
      <>
        <p>You agree to use the services only for lawful purposes and in accordance with these Terms. You will not:</p>
        <ul>
          <li>Use the services to harass, defraud, or impersonate others</li>
          <li>Generate or distribute illegal, harmful, or copyrighted content without permission</li>
          <li>Attempt to reverse-engineer, scrape, or circumvent rate limits</li>
          <li>Use the services to operate critical infrastructure (medical, transportation, military) without explicit written consent</li>
          <li>Resell the services as a generic AI API without explicit partnership agreement</li>
        </ul>
      </>
    ),
  },
  {
    id: 'plans',
    title: '3. Plans and billing',
    body: (
      <>
        <p>
          Voiceify offers Free, Pro, Enterprise, and Custom plans. Paid plans are billed monthly or annually in
          advance. Custom (n8n workflow) engagements are quoted separately and billed per project.
        </p>
        <p>
          You may cancel any subscription at any time via the dashboard. Refunds for partial periods are at our
          discretion. See our <Link to="/pricing">pricing page</Link> for details.
        </p>
      </>
    ),
  },
  {
    id: 'data',
    title: '4. Your data',
    body: (
      <>
        <p>
          You retain ownership of all content and data you submit to Voiceify. You grant us a limited licence to
          process this data solely to deliver the service. We do not train our foundation models on customer data
          without explicit, opt-in consent.
        </p>
        <p>For more on how we handle data, see our <Link to="/privacy">Privacy Policy</Link>.</p>
      </>
    ),
  },
  {
    id: 'sla',
    title: '5. Service availability',
    body: (
      <>
        <p>
          We aim for 99.9% uptime on Pro plans and 99.99% on Enterprise plans. Service credits are issued per the
          terms of your specific SLA. Free plan is provided as-is without uptime guarantees.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    title: '6. Limitation of liability',
    body: (
      <p>
        To the maximum extent permitted by law, Voiceify is not liable for indirect, consequential, or special
        damages. Our total liability is limited to the amount you paid us in the 12 months preceding the claim.
      </p>
    ),
  },
  {
    id: 'termination',
    title: '7. Termination',
    body: (
      <p>
        We may suspend or terminate your access immediately for material breach of these Terms or any conduct that
        materially harms other users or the service. You may terminate at any time by deleting your account.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '8. Changes to these terms',
    body: (
      <p>
        We may update these Terms from time to time. We will notify you of material changes via email or dashboard
        notice at least 30 days before they take effect. Continued use of the service after changes take effect
        constitutes acceptance.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '9. Contact',
    body: (
      <p>
        Questions about these Terms? Email <a href="mailto:legal@voiceify.ai">legal@voiceify.ai</a> or visit
        our <Link to="/contact">contact page</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Terms of Service"
      intro="The rules of the road for using Voiceify. We've kept the language plain and the surprises few."
      lastUpdated="April 26, 2026"
      sections={SECTIONS}
    />
  );
}
