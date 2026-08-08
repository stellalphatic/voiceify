/**
 * ContactPage.tsx — Phase 1 Polish (April 2026)
 * Modern split layout: contact details + form with success state.
 */
import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Check, Loader2, AlertCircle } from 'lucide-react';
import { apiJson } from '../lib/auth/client';

const CONTACT_BLOCKS = [
  {
    Icon: Mail,
    title: 'Email us',
    primary: 'support@voiceify.ai',
    secondary: 'For technical questions and support',
    href: 'mailto:support@voiceify.ai',
  },
  {
    Icon: Phone,
    title: 'Talk to sales',
    primary: '+1 (555) 123-4567',
    secondary: 'Mon-Fri, 9am-6pm PST',
    href: 'tel:+15551234567',
  },
  {
    Icon: MapPin,
    title: 'Visit',
    primary: '123 AI Boulevard',
    secondary: 'San Francisco, CA 94105',
    href: '#',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;

    setStatus('sending');
    setError(null);
    try {
      await apiJson('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ ...formData, website }),
      });
      setStatus('sent');
      setFormData({ name: '', email: '', company: '', message: '' });
      window.setTimeout(() => setStatus('idle'), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-voice-bg text-voice-text font-sans selection:bg-voice-accent selection:text-voice-on-accent pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
              color: 'var(--color-accent)',
            }}>
            Contact
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">Get in touch</h1>
          <p className="text-lg text-voice-muted leading-relaxed">
            Questions about pricing, custom n8n workflows, enterprise deployments, or just want to chat? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Contact details ── */}
          <div className="lg:col-span-2 space-y-3">
            {CONTACT_BLOCKS.map(({ Icon, title, primary, secondary, href }) => (
              <a
                key={title}
                href={href}
                className="group block p-5 rounded-2xl border border-voice-frost-border bg-voice-surface hover:border-voice-accent/40 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-voice-muted mb-1.5">{title}</p>
                    <p className="text-base font-semibold text-voice-text mb-0.5">{primary}</p>
                    <p className="text-xs text-voice-muted">{secondary}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* ── Form ── */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-3 bg-voice-surface p-7 md:p-10 rounded-3xl border border-voice-frost-border space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-voice-muted mb-2">Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-voice-bg border border-voice-frost-border rounded-xl px-4 py-3 text-voice-text placeholder:text-voice-muted/60 focus:outline-none focus:border-voice-accent focus:ring-2 focus:ring-voice-accent/20 transition-all"
                  placeholder="John Carter"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-voice-muted mb-2">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-voice-bg border border-voice-frost-border rounded-xl px-4 py-3 text-voice-text placeholder:text-voice-muted/60 focus:outline-none focus:border-voice-accent focus:ring-2 focus:ring-voice-accent/20 transition-all"
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="company" className="block text-xs font-semibold uppercase tracking-wider text-voice-muted mb-2">Company <span className="lowercase font-normal text-voice-muted/60">(optional)</span></label>
              <input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full bg-voice-bg border border-voice-frost-border rounded-xl px-4 py-3 text-voice-text placeholder:text-voice-muted/60 focus:outline-none focus:border-voice-accent focus:ring-2 focus:ring-voice-accent/20 transition-all"
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-voice-muted mb-2">Message</label>
              <textarea
                id="message"
                rows={5}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-voice-bg border border-voice-frost-border rounded-xl px-4 py-3 text-voice-text placeholder:text-voice-muted/60 focus:outline-none focus:border-voice-accent focus:ring-2 focus:ring-voice-accent/20 transition-all resize-none"
                placeholder="Tell us about your project, use case, or question..."
              />
            </div>
            {/* Honeypot — hidden from humans, filled by bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
            />
            {error && (
              <p role="alert" className="flex items-center gap-2 text-sm text-voice-danger">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status !== 'idle'}
              className="w-full bg-voice-accent hover:bg-voice-accent-hover text-voice-on-accent font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-90"
            >
              {status === 'sending' && <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>}
              {status === 'sent'    && <><Check className="w-4 h-4" /> Message sent!</>}
              {status === 'idle'    && <>Send message <Send className="w-4 h-4" /></>}
            </button>
            <p aria-live="polite" className="text-xs text-voice-muted text-center">
              {status === 'sent'
                ? 'Thanks — your message is with our team. We typically reply within 1 business day.'
                : 'We typically reply within 1 business day.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
