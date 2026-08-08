import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CORE_PAIN_POINT, PERSONA_TIME_SAVERS, POSITIONING } from '../lib/positioning';
import HeroCallPanel from '../components/landing/HeroCallPanel';
import {
  ArrowRight,
  Building2,
  Briefcase,
  Check,
  Code2,
  Globe,
  Headphones,
  Mic,
  Phone,
  Play,
  Shield,
  Sparkles,
  Utensils,
  Zap,
  ChevronDown,
} from 'lucide-react';

const AUDIENCE_PATHS = [
  {
    id: 'smb',
    href: '/auth?mode=signup',
    icon: Building2,
    audience: 'Small business',
    title: 'Reclaim rush hour',
    description: 'Pre-built agents answer when your front desk can\u2019t — bookings, appointments, and FAQs without pulling staff off the floor.',
    bullets: ['3+ hours saved per day', 'Deploy in under 5 minutes', '100 free minutes / month'],
    tags: ['Free forever', 'No setup fees'],
    cta: 'Get started free',
    featured: false,
  },
  {
    id: 'enterprise',
    href: '/contact',
    icon: Briefcase,
    audience: 'Enterprise',
    title: 'Scale with confidence',
    description: 'Custom workflows, dedicated support, and SLAs built for high-volume operations.',
    bullets: ['Custom n8n integrations', 'Dedicated success manager', '99.9% uptime SLA'],
    tags: ['Most flexible', 'White-glove onboarding'],
    cta: 'Talk to sales',
    featured: true,
  },
  {
    id: 'developers',
    href: '/docs',
    icon: Code2,
    audience: 'Developers',
    title: 'Build your own stack',
    description: 'Full API access, streaming voice pipeline, and a sandbox you can hit in 30 seconds.',
    bullets: ['REST API with streaming responses', 'Sub-500ms streaming TTS', 'Copy-paste curl examples'],
    tags: ['API-first', 'Sandbox included'],
    cta: 'View API docs',
    featured: false,
  },
] as const;

const PLATFORM_FEATURES = [
  {
    icon: Zap,
    category: 'Performance',
    title: 'Sub-500ms latency',
    description: 'Streamed STT → LLM → TTS pipeline tuned for live conversation — not batch replies.',
    stat: '<500ms',
    hero: true,
  },
  {
    icon: Mic,
    category: 'Voice',
    title: 'Natural voices',
    description: 'ElevenLabs-powered speech with 50+ neural voices and real-time tone adaptation.',
    stat: '50+ voices',
    hero: true,
  },
  {
    icon: Globe,
    category: 'Language',
    title: '40+ languages',
    description: 'Auto-detect and switch mid-call — English, Urdu, Arabic, and more with zero config.',
    stat: '40+',
    hero: false,
  },
  {
    icon: Phone,
    category: 'Intelligence',
    title: 'Live call streaming',
    description: 'Real-time transcription, sentiment signals, and coaching during every conversation.',
    stat: 'Real-time',
    hero: false,
  },
  {
    icon: Sparkles,
    category: 'Templates',
    title: 'Ready-made personas',
    description: 'Restaurant, dental, and support agents — deploy and customize in minutes.',
    stat: '3 included',
    hero: false,
  },
  {
    icon: Shield,
    category: 'Security',
    title: 'Keys stay server-side',
    description: 'Encrypted in transit and at rest, with speech and LLM credentials never exposed to the browser.',
    stat: 'Encrypted',
    hero: false,
  },
  {
    icon: Headphones,
    category: 'Testing',
    title: 'In-browser sandbox',
    description: 'Test agents with real microphone audio — no phone number or Twilio setup needed.',
    stat: 'WebRTC',
    hero: false,
  },
  {
    icon: Code2,
    category: 'Developers',
    title: 'Streaming REST API',
    description: 'Drive the whole voice pipeline over HTTP with streamed audio — ship it in any stack.',
    stat: 'REST',
    hero: false,
  },
] as const;

const AGENT_PERSONAS = [
  {
    id: 'restaurant',
    icon: Utensils,
    agentName: 'Nova',
    role: 'Restaurant Reservations',
    description: PERSONA_TIME_SAVERS.restaurant,
    sampleLine: '"I know you\'re busy — quick table for two at nine?"',
    replyLine: '"Of course — 9 PM for two. Any seating preference?"',
    skills: ['Rush-hour bookings', 'Menu & hours', 'No voicemail'],
    tags: ['Hospitality', 'English / Urdu'],
    featured: true,
  },
  {
    id: 'healthcare',
    icon: Sparkles,
    agentName: 'Dr. Sarah',
    role: 'Healthcare Scheduling',
    description: PERSONA_TIME_SAVERS.healthcare,
    sampleLine: '"I\'m on my lunch break — book a checkup next week?"',
    replyLine: '"Happy to help — preferred day and time?"',
    skills: ['No-hold booking', 'Clinic hours', 'Quick intake'],
    tags: ['Clinic', 'Calm tone'],
    featured: false,
  },
  {
    id: 'support',
    icon: Headphones,
    agentName: 'Alex',
    role: 'Customer Support',
    description: PERSONA_TIME_SAVERS.support,
    sampleLine: '"I can\'t wait on hold — my invoice was charged twice."',
    replyLine: '"I can check that — what email is on your account?"',
    skills: ['Instant billing', 'Account access', 'No callback loop'],
    tags: ['Support', '24/7 ready'],
    featured: false,
  },
] as const;

const SANDBOX_HIGHLIGHTS = [
  { icon: Mic, label: 'Browser mic', value: 'WebRTC audio' },
  { icon: Zap, label: 'Latency', value: '<500ms' },
  { icon: Headphones, label: 'Deploy', value: 'Zero setup' },
] as const;

const FAQ_ITEMS = [
  {
    id: 'free-plan',
    topic: 'start',
    q: 'Is there a free plan?',
    a: 'Yes — the Free tier includes 100 minutes per month with no credit card required. Upgrade to Pro when you need more volume, custom personas, or API access.',
  },
  {
    id: 'install',
    topic: 'start',
    q: 'Do I need to install anything?',
    a: 'No. Voiceify runs entirely in the cloud. Sign up, pick a persona, and launch a live demo from your browser in under five minutes.',
  },
  {
    id: 'latency',
    topic: 'voice',
    q: 'How fast is the response time?',
    a: 'Sub-500ms end-to-end on cached phrases; typical live turns land under a second. STT, LLM, and ElevenLabs TTS stream in parallel so callers hear replies without awkward pauses.',
  },
  {
    id: 'missed-calls',
    topic: 'start',
    q: 'How does this help during rush hour?',
    a: 'When your front desk is busiest, Voiceify picks up every call instantly — bookings, appointments, and tier-one support finish in one conversation. Teams typically reclaim 3+ hours a day from repeat calls and callbacks.',
  },
  {
    id: 'languages',
    topic: 'voice',
    q: 'What languages are supported?',
    a: '40+ languages with auto-detection mid-call, including English, Urdu, Spanish, French, and Arabic. Switch languages without restarting the session.',
  },
  {
    id: 'custom-voice',
    topic: 'voice',
    q: 'Can I use my own voice?',
    a: 'Choose from 50+ neural voices or clone your brand voice from a short audio sample. Personas can be tuned per industry — restaurant, healthcare, or support out of the box.',
  },
  {
    id: 'security',
    topic: 'security',
    q: 'How secure is my data?',
    a: 'Data is encrypted in transit and at rest, every record is scoped to your workspace, and speech and LLM keys stay on our servers rather than in the browser. We hold no security certifications yet — the security page lists exactly what ships today and what is still planned.',
  },
] as const;

const FINAL_STEPS = [
  {
    num: '01',
    icon: Mic,
    title: 'Pick a persona',
    desc: 'Restaurant, clinic, or support — ready in one click',
  },
  {
    num: '02',
    icon: Play,
    title: 'Talk in the sandbox',
    desc: 'Real microphone, sub-500ms replies, 40+ languages',
  },
  {
    num: '03',
    icon: Zap,
    title: 'Deploy to your line',
    desc: 'Connect n8n, Sheets, or your CRM in minutes',
  },
] as const;

const FINAL_TRUST = [
  'No credit card required',
  '100 free minutes / month',
  'Live in under 5 minutes',
] as const;

const HERO_PERSONA_CHIPS = [
  { id: 'restaurant', label: 'Restaurant', icon: Utensils },
  { id: 'healthcare', label: 'Healthcare', icon: Shield },
  { id: 'support', label: 'Support', icon: Headphones },
] as const;

const HERO_PROMPT_PLACEHOLDERS = [
  'Quick table for two at nine — I know you\'re busy',
  'Book a checkup on my lunch break please',
  'Can\'t wait on hold — my invoice was charged twice',
] as const;

const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    badge: 'Starter',
    price: '$0',
    period: '/ month',
    sub: '100 minutes included',
    tagline: 'Test voice AI with zero commitment.',
    features: ['1 agent persona', 'Browser sandbox', 'Google Sheets logging', 'Community support'],
    cta: 'Start free',
    href: '/auth?mode=signup',
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Most popular',
    price: '$149',
    period: '/ month',
    sub: 'Unlimited calls · save 20% yearly',
    tagline: 'For teams running voice AI daily.',
    features: ['All 3 personas', '40+ languages', 'n8n webhooks', 'Priority support (4h)'],
    cta: 'Start free trial',
    href: '/auth?mode=signup',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Scale',
    price: 'Custom',
    period: ' pricing',
    sub: 'Volume discounts + SLA',
    tagline: 'For orgs with volume and support needs.',
    features: ['Volume discounts', 'Agreed support response times', 'Security review', 'Dedicated manager'],
    cta: 'Talk to sales',
    href: '/contact',
    featured: false,
  },
] as const;

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaqId, setOpenFaqId] = useState<string | null>('free-plan');
  const [heroPrompt, setHeroPrompt] = useState('');
  const [heroPersona, setHeroPersona] = useState<(typeof HERO_PERSONA_CHIPS)[number]['id']>('restaurant');

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const submitHeroPrompt = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({ persona: heroPersona });
    const prompt = heroPrompt.trim();
    if (prompt) params.set('prompt', prompt);
    navigate(`/demo?${params.toString()}`);
  };

  return (
    <div className="lp" id="main-content">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="lp-hero lp-section" aria-labelledby="hero-heading">
        <div className="lp-hero-bg" aria-hidden>
          <div className="lp-hero-glow" />
        </div>
        <div className="lp-container">
          <div className="lp-hero-grid">
            <div className="lp-hero-content">
              <span className="lp-eyebrow">{POSITIONING.eyebrow}</span>
              <h1 className="lp-h1" id="hero-heading">
                {POSITIONING.headline}{' '}
                <span className="lp-gradient-text">{POSITIONING.headlineAccent}</span>
              </h1>
              <p className="lp-lead">
                {POSITIONING.lead} {POSITIONING.subLead}
              </p>
              <div className="lp-actions">
                <Link to="/auth?mode=signup" className="lp-btn lp-btn--primary" id="hero-cta-primary">
                  Start for free <ArrowRight size={16} aria-hidden />
                </Link>
                <Link to="/demo" className="lp-btn lp-btn--ghost" id="hero-cta-demo">
                  <Play size={15} aria-hidden className="lp-btn-icon" />
                  Hear a live call
                </Link>
              </div>

              <form className="lp-hero-prompt" onSubmit={submitHeroPrompt}>
                <label className="lp-hero-prompt-label" htmlFor="hero-prompt">
                  Try before you sign up
                </label>
                <div className="lp-hero-prompt-row">
                  <Mic size={16} aria-hidden className="lp-hero-prompt-icon" />
                  <input
                    id="hero-prompt"
                    type="text"
                    className="lp-hero-prompt-input"
                    value={heroPrompt}
                    onChange={(event) => setHeroPrompt(event.target.value)}
                    placeholder={HERO_PROMPT_PLACEHOLDERS[0]}
                    autoComplete="off"
                  />
                  <button type="submit" className="lp-hero-prompt-btn">
                    Try live
                    <ArrowRight size={14} aria-hidden />
                  </button>
                </div>
                <div className="lp-hero-chips" role="group" aria-label="Demo personas">
                  {HERO_PERSONA_CHIPS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`lp-hero-chip${heroPersona === id ? ' is-active' : ''}`}
                      aria-pressed={heroPersona === id}
                      onClick={() => setHeroPersona(id)}
                    >
                      <Icon size={13} aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
              </form>

              <p className="lp-hero-note">
                <Check size={13} aria-hidden />
                No credit card · 100 free minutes / month
              </p>
            </div>

            <div className="lp-call-wrap">
              <HeroCallPanel persona={heroPersona} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Audience paths ─────────────────────────────────── */}
      <section className="lp-section lp-paths" id="audience-fork">
        <div className="lp-paths-bg" aria-hidden />
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">Who it&apos;s for</span>
            <h2 className="lp-h2">Start where you are</h2>
            <p className="lp-lead lp-lead--center">
              Whether you run a shop, a call center, or ship APIs — start where it makes sense,
              scale when you&apos;re ready.
            </p>
          </div>

          <div className="lp-path-grid">
            {AUDIENCE_PATHS.map((path) => {
              const Icon = path.icon;
              return (
                <Link
                  key={path.id}
                  to={path.href}
                  className={`lp-path-card${path.featured ? ' lp-path-card--featured' : ''}`}
                >
                  <div className="lp-path-card-head">
                    <span className="lp-path-icon" aria-hidden>
                      <Icon size={22} />
                    </span>
                  </div>
                  <span className="lp-path-audience">{path.audience}</span>
                  <h3 className="lp-path-title">{path.title}</h3>
                  <p className="lp-path-desc">{path.description}</p>
                  <ul className="lp-path-bullets">
                    {path.bullets.map((item) => (
                      <li key={item}>
                        <Check size={14} aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <span className="lp-path-cta">
                    {path.cta}
                    <ArrowRight size={15} aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>

          <p className="lp-path-footer">
            Not sure which fits?{' '}
            <Link to="/demo" className="lp-path-footer-link">
              Try the live demo
            </Link>{' '}
            or{' '}
            <Link to="/contact" className="lp-path-footer-link">
              talk to our team
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="lp-section lp-features lp-section--alt" id="features">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">Platform</span>
            <h2 className="lp-h2">Everything for production voice AI</h2>
            <p className="lp-lead lp-lead--center">
              From natural speech to real-time analytics — one stack, no duct tape.
            </p>
          </div>

          <div className="lp-feat-layout">
            {PLATFORM_FEATURES.filter((f) => f.hero).map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="lp-feat-card lp-feat-card--hero">
                  <div className="lp-feat-card-top">
                    <span className="lp-feat-cat">{f.category}</span>
                    <span className="lp-feat-stat">{f.stat}</span>
                  </div>
                  <span className="lp-feat-icon" aria-hidden>
                    <Icon size={24} />
                  </span>
                  <h3 className="lp-feat-title">{f.title}</h3>
                  <p className="lp-feat-desc">{f.description}</p>
                </div>
              );
            })}

            <div className="lp-feat-grid">
              {PLATFORM_FEATURES.filter((f) => !f.hero).map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="lp-feat-card lp-feat-card--compact">
                    <div className="lp-feat-card-top">
                      <span className="lp-feat-cat">{f.category}</span>
                      <span className="lp-feat-stat lp-feat-stat--sm">{f.stat}</span>
                    </div>
                    <span className="lp-feat-icon lp-feat-icon--sm" aria-hidden>
                      <Icon size={18} />
                    </span>
                    <h3 className="lp-feat-title">{f.title}</h3>
                    <p className="lp-feat-desc">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lp-feat-footer">
            <Link to="/demo" className="lp-feat-footer-cta">
              <Play size={15} aria-hidden />
              See the pipeline live
              <ArrowRight size={15} aria-hidden />
            </Link>
            <Link to="/docs" className="lp-feat-footer-link">
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Personas ───────────────────────────────────────── */}
      <section className="lp-section lp-personas" id="persona-library">
        <div className="lp-personas-bg" aria-hidden />
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">Personas</span>
            <h2 className="lp-h2">Agents built for rush hour</h2>
            <p className="lp-lead lp-lead--center">
              Three personas that answer when your team can&apos;t — each saves hours of
              repeat calls in English, Urdu, and 40+ languages.
            </p>
          </div>

          <div className="lp-persona-grid">
            {AGENT_PERSONAS.map((p) => {
              const Icon = p.icon;
              return (
                <article
                  key={p.id}
                  className={`lp-persona-card${p.featured ? ' lp-persona-card--featured' : ''}`}
                >
                  <div className="lp-persona-card-head">
                    <span className="lp-persona-index">Voice agent</span>
                    <span className="lp-persona-live">Ready</span>
                  </div>

                  <div className="lp-persona-identity">
                    <span className="lp-persona-avatar" aria-hidden>
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3 className="lp-persona-name">{p.agentName}</h3>
                      <p className="lp-persona-role">{p.role}</p>
                    </div>
                  </div>

                  <p className="lp-persona-desc">{p.description}</p>

                  <div className="lp-persona-chat" aria-label="Example conversation">
                    <div className="lp-persona-bubble lp-persona-bubble--user">{p.sampleLine}</div>
                    <div className="lp-persona-bubble lp-persona-bubble--agent">{p.replyLine}</div>
                  </div>

                  <ul className="lp-persona-skills">
                    {p.skills.map((skill) => (
                      <li key={skill}>
                        <Check size={13} aria-hidden />
                        {skill}
                      </li>
                    ))}
                  </ul>

                  <div className="lp-persona-tags">
                    {p.tags.map((tag) => (
                      <span key={tag} className="lp-persona-tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="lp-persona-actions">
                    <Link to={`/demo?persona=${p.id}`} className="lp-persona-cta lp-persona-cta--primary">
                      <Mic size={15} aria-hidden />
                      Try live
                    </Link>
                    <Link to="/auth?mode=signup" className="lp-persona-cta lp-persona-cta--ghost">
                      Deploy
                      <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="lp-persona-footer">
            Need something custom?{' '}
            <Link to="/auth?mode=signup" className="lp-persona-footer-link">
              Build your own agent from scratch
            </Link>{' '}
            or{' '}
            <Link to="/contact" className="lp-persona-footer-link">
              talk to our team
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Sandbox ──────────────────────────────────────────── */}
      <section className="lp-section lp-sandbox lp-section--alt" id="sandbox-section">
        <div className="lp-container">
          <div className="lp-sandbox-layout">
            <div className="lp-sandbox-content">
              <span className="lp-eyebrow">How it works</span>
              <h2 className="lp-h2">Test before you go live</h2>
              <p className="lp-lead">
                Run real voice conversations against your agent in the browser — no phone
                number, no deploy step. Tune prompts, hear ElevenLabs voices, ship when it
                sounds right.
              </p>

              <div className="lp-sandbox-stats">
                {SANDBOX_HIGHLIGHTS.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="lp-sandbox-stat">
                    <span className="lp-sandbox-stat-icon" aria-hidden>
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <ul className="lp-sandbox-checklist">
                <li>
                  <Check size={16} aria-hidden />
                  Real microphone audio — works in Google Chrome
                </li>
                <li>
                  <Check size={16} aria-hidden />
                  Full transcript logging for every test turn
                </li>
                <li>
                  <Check size={16} aria-hidden />
                  Latency meter shows sub-500ms pipeline performance
                </li>
              </ul>

              <div className="lp-sandbox-actions">
                <Link to="/demo" className="lp-btn lp-btn--primary">
                  <Play size={16} aria-hidden />
                  Open live sandbox
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <Link to="/auth?mode=signup" className="lp-btn lp-btn--ghost">
                  Go to dashboard
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pricing teaser ─────────────────────────────────── */}
      <section className="lp-section lp-pricing" id="pricing-teaser">
        <div className="lp-pricing-bg" aria-hidden />
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">Pricing</span>
            <h2 className="lp-h2">Plans that scale with you</h2>
            <p className="lp-lead lp-lead--center">
              Start free with 100 minutes, upgrade when you&apos;re ready. Transparent billing —
              no hidden fees, no annual lock-in.
            </p>
          </div>

          <div className="lp-pricing-grid">
            {PRICING_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`lp-pricing-card${plan.featured ? ' lp-pricing-card--featured' : ''}`}
              >
                <div className="lp-pricing-card-top">
                  <span className="lp-pricing-name">{plan.name}</span>
                </div>

                <div className="lp-pricing-amount">
                  <strong>{plan.price}</strong>
                  <span>{plan.period}</span>
                </div>
                <p className="lp-pricing-sub">{plan.sub}</p>
                <p className="lp-pricing-tagline">{plan.tagline}</p>

                <ul className="lp-pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={14} aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.href}
                  className={`lp-pricing-cta${plan.featured ? ' lp-pricing-cta--primary' : ''}`}
                  id={plan.featured ? 'pricing-cta-btn' : undefined}
                >
                  {plan.cta}
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </article>
            ))}
          </div>

          <p className="lp-pricing-footer">
            Need the full comparison including Custom n8n workflows?{' '}
            <Link to="/pricing" className="lp-pricing-footer-link">
              View all plans
            </Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="lp-section lp-faq-section" id="faq">
        <div className="lp-faq-bg" aria-hidden />
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">FAQ</span>
            <h2 className="lp-h2">Common questions</h2>
            <p className="lp-lead lp-lead--center">
              Plans, latency, languages, and security — the basics.
            </p>
          </div>

          <div className="lp-faq-layout lp-faq-layout--simple">
            <div className="lp-faq-list">
              {FAQ_ITEMS.map((faq) => (
                <div
                  key={faq.id}
                  className={`lp-faq-item${openFaqId === faq.id ? ' is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="lp-faq-trigger"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={openFaqId === faq.id}
                  >
                    <span className="lp-faq-trigger-inner">
                      <span className="lp-faq-q">{faq.q}</span>
                    </span>
                    <ChevronDown className="lp-faq-icon" size={18} aria-hidden />
                  </button>
                  <div className="lp-faq-answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="lp-final-section" id="get-started">
        <div className="lp-final-bg" aria-hidden />
        <div className="lp-container">
          <div className="lp-final-panel">
            <div className="lp-final-glow" aria-hidden />

            <div className="lp-final-content">
              <span className="lp-eyebrow">{POSITIONING.eyebrow}</span>
              <h2 className="lp-h2">
                Stop losing customers when you&apos;re busiest
              </h2>

              <div className="lp-final-pain">
                <div className="lp-final-pain__stat">
                  <strong>{CORE_PAIN_POINT.outcome}</strong>
                  <span>{CORE_PAIN_POINT.outcomeDetail}</span>
                </div>
                <p className="lp-final-pain__solution">{CORE_PAIN_POINT.solution}</p>
                <p className="lp-final-pain__caller">{CORE_PAIN_POINT.callerBenefit}</p>
              </div>

              <div className="lp-final-actions">
                <Link to="/auth?mode=signup" className="lp-btn lp-btn--primary" id="final-cta-signup">
                  Get started free
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <Link to="/demo" className="lp-btn lp-btn--ghost">
                  <Play size={15} aria-hidden className="lp-btn-icon" />
                  Try the demo
                </Link>
              </div>

              <div className="lp-final-trust">
                {FINAL_TRUST.map((item) => (
                  <span key={item} className="lp-final-trust-item">
                    <Check size={14} aria-hidden />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="lp-final-side">
              <p className="lp-final-steps-label">Go live in three steps</p>
              <ol className="lp-final-step-list">
                {FINAL_STEPS.map((step) => (
                  <li key={step.num} className="lp-final-step">
                    <span className="lp-final-step-num">{step.num}</span>
                    <span className="lp-final-step-icon" aria-hidden>
                      <step.icon size={15} />
                    </span>
                    <span>
                      <strong>{step.title}</strong>
                      <span>{step.desc}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="lp-final-mock">
                <div className="lp-final-mock-head">
                  <span className="lp-final-mock-status">
                    <span className="lp-final-mock-dot" aria-hidden />
                    Live voice demo
                  </span>
                  <span className="lp-final-mock-persona">Nova · Restaurant</span>
                </div>
                <ul className="lp-final-mock-checklist">
                  <li>
                    <Check size={14} aria-hidden />
                    Auto-detects caller language
                  </li>
                  <li>
                    <Check size={14} aria-hidden />
                    Barge-in while agent speaks
                  </li>
                  <li>
                    <Check size={14} aria-hidden />
                    No API keys in the browser
                  </li>
                </ul>
                <p className="lp-final-mock-latency">
                  <Zap size={14} aria-hidden />
                  Typical reply under 500ms
                </p>
                <Link to="/demo" className="lp-final-mock-cta">
                  Open live demo
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          <div className="lp-final-footer-row">
            <p>
              Comparing plans?{' '}
              <Link to="/pricing" className="lp-final-footer-link">
                View pricing
              </Link>
            </p>
            <p>
              More questions?{' '}
              <Link to="/contact" className="lp-final-footer-link">
                Contact us
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
