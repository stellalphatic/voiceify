/**
 * CareersPage.tsx — Phase 1 Polish (April 2026)
 * Hero + perks + jobs list with department filter.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Coffee, Globe, GraduationCap, HeartPulse } from 'lucide-react';

const JOBS = [
  { title: 'Senior Backend Engineer',     department: 'Engineering', location: 'Remote',                type: 'Full-time' },
  { title: 'AI Research Scientist',        department: 'Research',    location: 'San Francisco, CA',     type: 'Full-time' },
  { title: 'Product Designer',             department: 'Design',      location: 'Remote',                type: 'Full-time' },
  { title: 'Developer Advocate',           department: 'Marketing',   location: 'New York, NY',          type: 'Full-time' },
  { title: 'Customer Success Engineer',    department: 'Engineering', location: 'London, UK',            type: 'Full-time' },
  { title: 'Voice Quality Researcher',     department: 'Research',    location: 'Remote',                type: 'Contract' },
];

const PERKS = [
  { Icon: Globe,         title: 'Remote-first',    desc: 'Work from anywhere. We have hubs in SF, NYC, and London for those who want office life.' },
  { Icon: GraduationCap, title: 'Learning budget', desc: '$2,000/year for courses, books, or conferences — no questions asked.' },
  { Icon: HeartPulse,    title: 'Health + wellness', desc: 'Top-tier medical, dental, vision, plus a wellness stipend.' },
  { Icon: Coffee,        title: 'Time off that works', desc: 'Unlimited PTO with a 4-week minimum. Mandatory company-wide breaks twice a year.' },
];

const DEPARTMENTS = ['All', 'Engineering', 'Research', 'Design', 'Marketing'] as const;
type Department = typeof DEPARTMENTS[number];

export default function CareersPage() {
  const [filter, setFilter] = useState<Department>('All');
  const visible = filter === 'All' ? JOBS : JOBS.filter(j => j.department === filter);

  return (
    <div className="min-h-screen bg-voice-bg text-voice-text font-sans selection:bg-voice-accent selection:text-voice-on-accent pt-28 pb-20">

      {/* ── Hero ── */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-20">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
            color: 'var(--color-accent)',
          }}>
          <Sparkles className="w-3.5 h-3.5" />
          We&apos;re hiring
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-5 leading-[1.05] tracking-tight">
          Build the future of conversation.
        </h1>
        <p className="text-lg text-voice-muted leading-relaxed max-w-2xl mx-auto">
          Join a small team of researchers and engineers shipping voice AI that actually works.
          We move fast, sweat the details, and trust each other to do the right thing.
        </p>
      </div>

      {/* ── Perks ── */}
      <div className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PERKS.map(({ Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl bg-voice-surface border border-voice-frost-border">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                }}
              >
                <Icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="text-base font-semibold mb-2">{title}</h3>
              <p className="text-sm text-voice-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Jobs ── */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Open positions</h2>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map(d => (
              <button
                key={d}
                onClick={() => setFilter(d)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === d
                    ? 'bg-voice-accent text-voice-on-accent'
                    : 'bg-voice-frost text-voice-muted hover:bg-voice-frost-hover hover:text-voice-text'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {visible.length === 0 && (
            <div className="text-center py-16 text-voice-muted">
              No open roles in this department right now.
              <br />
              <Link to="/contact" className="text-voice-accent hover:underline mt-2 inline-block">
                Send us a speculative application →
              </Link>
            </div>
          )}
          {visible.map((job, i) => (
            <Link
              to="/contact"
              key={i}
              className="group block p-5 sm:p-6 rounded-2xl bg-voice-surface border border-voice-frost-border hover:border-voice-accent/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1.5 group-hover:text-voice-accent transition-colors">{job.title}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-voice-muted">
                    <span>{job.department}</span>
                    <span aria-hidden>·</span>
                    <span>{job.location}</span>
                    <span aria-hidden>·</span>
                    <span>{job.type}</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-voice-muted group-hover:text-voice-accent group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
