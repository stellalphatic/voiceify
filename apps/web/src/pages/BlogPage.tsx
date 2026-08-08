/**
 * BlogPage.tsx — Phase 1 Polish (April 2026)
 * Modern blog grid with featured post + category filter.
 */
import React, { useState } from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface Post {
  title:    string;
  excerpt:  string;
  date:     string;
  author:   string;
  authorInitials: string;
  category: 'Engineering' | 'Product' | 'Research' | 'Company';
  readTime: string;
  featured?: boolean;
}

const POSTS: Post[] = [
  {
    title: 'Optimising voice latency with Groq LPUs',
    excerpt: 'How we achieved sub-500ms response times by rethinking our inference pipeline from STT to TTS — and why the bottleneck wasn\'t where we thought.',
    date: 'Feb 15, 2026',
    author: 'Sarah Chen',
    authorInitials: 'SC',
    category: 'Engineering',
    readTime: '8 min',
    featured: true,
  },
  {
    title: 'The future of multilingual AI agents',
    excerpt: 'Breaking down language barriers with our new automatic language identification system that switches mid-conversation.',
    date: 'Jan 28, 2026',
    author: 'Michael Ross',
    authorInitials: 'MR',
    category: 'Product',
    readTime: '6 min',
  },
  {
    title: 'Building natural conversations: beyond keywords',
    excerpt: 'Why context awareness is the key to making voice agents feel human, and how we\'re training models to handle interruptions gracefully.',
    date: 'Jan 10, 2026',
    author: 'Emma Wilson',
    authorInitials: 'EW',
    category: 'Research',
    readTime: '10 min',
  },
  {
    title: 'Wiring appointment booking into your own systems',
    excerpt: 'A walkthrough of connecting the Appointments pack to an external scheduler using custom HTTP tools and webhooks.',
    date: 'Dec 18, 2025',
    author: 'Priya Shah',
    authorInitials: 'PS',
    category: 'Product',
    readTime: '7 min',
  },
];

const CATEGORIES = ['All', 'Engineering', 'Product', 'Research', 'Company'] as const;
type Category = typeof CATEGORIES[number];

export default function BlogPage() {
  const [active, setActive] = useState<Category>('All');
  const filtered = active === 'All' ? POSTS : POSTS.filter(p => p.category === active);
  const featured = filtered.find(p => p.featured);
  const others   = filtered.filter(p => !p.featured);

  return (
    <div className="min-h-screen bg-voice-bg text-voice-text font-sans selection:bg-voice-accent selection:text-voice-on-accent pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)',
              color: 'var(--color-accent)',
            }}>
            Blog
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">Engineering, research, and stories.</h1>
          <p className="text-lg text-voice-muted max-w-2xl mx-auto leading-relaxed">
            Deep-dives into voice AI, latency engineering, and what we&apos;re learning along the way.
          </p>
        </div>

        {/* ── Category filter ── */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                active === c
                  ? 'bg-voice-accent text-voice-on-accent'
                  : 'bg-voice-frost text-voice-muted hover:bg-voice-frost-hover hover:text-voice-text'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* ── Featured post ── */}
        {featured && (
          <article
            className="group block mb-12 p-8 md:p-10 rounded-3xl border border-voice-frost-border hover:border-voice-accent/40 cursor-pointer transition-all"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 6%, var(--color-bg-secondary)) 0%, var(--color-bg-secondary) 100%)',
            }}
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-voice-muted mb-5">
              <span className="px-2.5 py-1 rounded-full font-semibold text-voice-text"
                    style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}>
                Featured
              </span>
              <span className="px-2.5 py-1 rounded-full font-medium bg-voice-frost">{featured.category}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{featured.date}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{featured.readTime}</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight group-hover:text-voice-accent transition-colors">
              {featured.title}
            </h2>
            <p className="text-base md:text-lg text-voice-muted mb-6 leading-relaxed max-w-3xl">{featured.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-voice-frost-strong flex items-center justify-center text-xs font-bold">
                  {featured.authorInitials}
                </div>
                <span className="text-sm font-medium">{featured.author}</span>
              </div>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-voice-accent">
                Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </article>
        )}

        {/* ── Others ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {others.map((post, i) => (
            <article
              key={i}
              className="group p-6 rounded-2xl bg-voice-surface border border-voice-frost-border hover:border-voice-accent/40 cursor-pointer transition-all flex flex-col"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-voice-muted mb-4">
                <span className="px-2.5 py-1 rounded-full font-medium bg-voice-frost">{post.category}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{post.readTime}</span>
              </div>
              <h2 className="text-lg font-bold mb-3 leading-snug group-hover:text-voice-accent transition-colors">{post.title}</h2>
              <p className="text-sm text-voice-muted mb-5 leading-relaxed flex-1">{post.excerpt}</p>
              <div className="flex items-center justify-between pt-4 border-t border-voice-frost-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-voice-frost-strong flex items-center justify-center text-xs font-bold">
                    {post.authorInitials}
                  </div>
                  <span className="text-xs font-medium">{post.author}</span>
                </div>
                <span className="text-xs text-voice-muted">{post.date}</span>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-voice-muted">
            No posts in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}
