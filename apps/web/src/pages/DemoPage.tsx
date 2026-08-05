import React, { useEffect, useRef, useState } from 'react';

import gsap from 'gsap';

import { useSearchParams } from 'react-router-dom';

import {
  Mic,
  RefreshCw,
  Zap,
  Volume2,
  Phone,
  AlertCircle,
  UtensilsCrossed,
  HeartPulse,
  LifeBuoy,
  Headphones,
  ChevronDown,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '../lib/utils';

import { CORE_PAIN_POINT, PERSONA_TIME_SAVERS } from '../lib/positioning';

import { DEMO_PERSONAS } from '../lib/voice-agent/personas';

import { getLanguageLabel, LANGUAGE_MODE_OPTIONS, type LanguageMode } from '../lib/voice-agent/language';

import { displaySpeakerLabel, speakerColor } from '../lib/voice-agent/speakers';

import {
  DEMO_PROMPT_CATEGORIES,
  getDemoPrompts,
  type DemoPromptCategory,
} from '../lib/voice-agent/demo-prompts';
import { NOVA_DEMO_PROMPTS } from '../lib/voice-agent/nova-demo';

import { useVoiceAgentFromRecord } from '../lib/voice-agent/useVoiceAgentFromRecord';
import { useAgentStore } from '../lib/agents/AgentStoreContext';



const STATUS_LABELS: Record<string, string> = {

  idle: 'Ready',

  connecting: 'Connecting…',

  listening: 'Listening',

  thinking: 'Thinking…',

  speaking: 'Speaking',

  error: 'Error',

};



const VALID_PERSONAS = new Set(['restaurant', 'healthcare', 'support']);



const PERSONA_META: Record<string, { icon: React.ElementType; color: string }> = {

  restaurant: { icon: UtensilsCrossed, color: '#525252' },

  healthcare: { icon: HeartPulse, color: '#737373' },

  support: { icon: LifeBuoy, color: '#a3a3a3' },

};

const DEMO_LANG_LABELS = { en: 'EN', ur: 'UR', mixed: 'EN+UR' } as const;



const LATENCY_TARGET_MS = 500;

const PIPELINE_STEPS = [
  { id: 'stt', label: 'Listen', icon: Mic },
  { id: 'llm', label: 'Think', icon: Brain },
  { id: 'tts', label: 'Speak', icon: Volume2 },
] as const;

function pipelineActiveIndex(status: string): number {
  if (status === 'listening') return 0;
  if (status === 'thinking') return 1;
  if (status === 'speaking') return 2;
  if (status === 'connecting') return 0;
  return -1;
}

export default function DemoPage() {
  const [searchParams] = useSearchParams();

  const initialPersona = searchParams.get('persona') ?? 'restaurant';

  const [activePersonaId, setActivePersonaId] = useState(

    VALID_PERSONAS.has(initialPersona) ? initialPersona : 'restaurant',

  );

  const [languageMode, setLanguageMode] = useState<LanguageMode>('auto');
  const [configOpen, setConfigOpen] = useState(true);
  const [promptFilter, setPromptFilter] = useState<'all' | DemoPromptCategory>('all');

  const { getAgentForPersona } = useAgentStore();
  const activeAgent = getAgentForPersona(activePersonaId);

  const {

    persona,

    status,

    messages,

    error,

    latencyMs,

    isActive,

    activeLanguage,

    diarizationEnabled,

    scribeSttEnabled,
    scribeRealtimeEnabled,

    geminiEnabled,
    groqEnabled,

    activeSpeakers,

    interruptCount,

    interimTranscript,

    sttFallbackWarning,

    startSession,

    endSession,

    resetConversation,

  } = useVoiceAgentFromRecord(activeAgent, languageMode);



  const visualizerRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const prevMessageCountRef = useRef(0);



  const personaMeta = PERSONA_META[activePersonaId] ?? PERSONA_META.restaurant;

  const demoPrompts = getDemoPrompts(activePersonaId);
  const promptCategories = [...new Set(demoPrompts.map((p) => p.category))];
  const filteredPrompts =
    promptFilter === 'all'
      ? demoPrompts
      : demoPrompts.filter((p) => p.category === promptFilter);

  const PersonaIcon = personaMeta.icon;

  const isLive = status === 'listening' || status === 'speaking' || status === 'thinking';
  const pipelineIdx = pipelineActiveIndex(status);
  const personaSaver =
    PERSONA_TIME_SAVERS[activePersonaId as keyof typeof PERSONA_TIME_SAVERS] ??
    PERSONA_TIME_SAVERS.restaurant;



  const latencyPct = latencyMs != null ? Math.min(100, (latencyMs / LATENCY_TARGET_MS) * 100) : 0;

  const latencyGood = latencyMs != null && latencyMs < LATENCY_TARGET_MS;



  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);



  /** Scroll only inside the chat panel — never the whole page. */
  const scrollChatToBottom = (smooth = true) => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    const count = messages.length;
    if (count === 0) {
      prevMessageCountRef.current = 0;
      return;
    }
    if (count > prevMessageCountRef.current) {
      requestAnimationFrame(() => scrollChatToBottom());
    }
    prevMessageCountRef.current = count;
  }, [messages]);

  useEffect(() => {
    if (status === 'thinking' && messages.length > 0) {
      requestAnimationFrame(() => scrollChatToBottom());
    }
  }, [status, messages.length]);



  useEffect(() => {

    if (!visualizerRef.current) return;

    const bars = visualizerRef.current.children;

    gsap.killTweensOf(bars);



    if (isLive) {

      Array.from(bars).forEach((bar: Element, i) => {

        const centerOffset = Math.abs(i - 11.5);

        const baseIntensity = Math.max(0.25, 1 - centerOffset / 12);

        gsap.to(bar, {

          height: () => Math.max(4, Math.random() * 44 * baseIntensity + 8),

          duration: () => 0.1 + Math.random() * 0.14,

          ease: 'power1.inOut',

          repeat: -1,

          yoyo: true,

        });

      });

    } else {

      Array.from(bars).forEach((bar: Element) => {

        gsap.to(bar, { height: 4, duration: 0.4 });

      });

    }

  }, [isLive]);



  const handlePersonaChange = (id: string) => {
    setActivePersonaId(id);
    setPromptFilter('all');
  };



  const toggleCall = () => {

    if (isActive) endSession({ userInitiated: true });

    else startSession();

  };



  const statusHint =

    status === 'connecting'

      ? 'Warming voice pipeline…'

      : isActive

        ? status === 'listening'

          ? 'Speak now — I\'m listening'

          : status === 'speaking'

            ? 'Speak anytime to interrupt — barge-in enabled'

            : status === 'thinking'

              ? 'Processing… speak to cancel and take over'

              : 'Session active'

        : status === 'error'

          ? 'Session error — tap mic to retry'

          : 'Tap mic to start a voice call';



  const ringClass =

    status === 'listening'

      ? 'demo-btn-mic-ring--listening'

      : status === 'thinking' || status === 'connecting'

        ? 'demo-btn-mic-ring--thinking'

        : status === 'speaking'

          ? 'demo-btn-mic-ring--speaking'

          : '';



  return (

    <div
      ref={containerRef}
      id="main-content"
      className="demo-page text-voice-text font-sans selection:bg-voice-accent selection:text-voice-bg"
    >

      <div className="demo-page__bg" aria-hidden="true" />



      <div className="demo-page__grid">

        {/* ── Left: context & pipeline ── */}

        <div className="demo-intro">
          <p className="demo-intro__eyebrow">
            <span className="demo-pixel-chip" aria-hidden>8-bit</span>
            Live voice demo
          </p>
          <h1 className="demo-hero__title">
            Talk to a voice agent
            <span className="demo-hero__title-accent">in under a second</span>
          </h1>
          <p className="demo-hero__desc">{CORE_PAIN_POINT.solution}</p>

          <div
            className="demo-intro__agent"
            style={{ '--demo-persona-color': personaMeta.color } as React.CSSProperties}
          >
            <div className="demo-intro__agent-icon">
              <PersonaIcon size={20} aria-hidden />
            </div>
            <div className="demo-intro__agent-body">
              <p className="demo-intro__agent-name">{persona.name}</p>
              <p className="demo-intro__agent-tag">{persona.tagline}</p>
              <p className="demo-intro__agent-desc">{personaSaver}</p>
            </div>
          </div>

          <div className="demo-pipeline" aria-label="Voice pipeline">
            {PIPELINE_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const active = pipelineIdx === i;
              const done = pipelineIdx > i;
              return (
                <React.Fragment key={step.id}>
                  <div
                    className={cn(
                      'demo-pipeline__step',
                      active && 'demo-pipeline__step--active',
                      done && 'demo-pipeline__step--done',
                    )}
                  >
                    <div className="demo-pipeline__icon">
                      <StepIcon size={16} aria-hidden />
                    </div>
                    <span className="demo-pipeline__label">{step.label}</span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <span className="demo-pipeline__arrow" aria-hidden>→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <ul className="demo-intro__tips">
            <li>
              <Mic size={14} aria-hidden />
              Chrome + microphone — no account
            </li>
            <li>
              <Headphones size={14} aria-hidden />
              Headphones reduce echo
            </li>
            <li>
              <Zap size={14} aria-hidden />
              Target &lt;{LATENCY_TARGET_MS}ms reply time
            </li>
          </ul>

          <Link to="/auth?mode=signup" className="demo-intro__cta">
            Create your own agent
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>



        {/* ── Right: interactive console ── */}

        <div

          className="demo-console"

          style={{ '--demo-persona-color': personaMeta.color } as React.CSSProperties}

        >

          <div className="demo-console__header">
            <div className="demo-console__header-main">
              <span className="demo-console__title">Voice sandbox</span>
              <span
                className={cn(
                  'demo-console__status-pill',
                  isActive && 'demo-console__status-pill--live',
                  status === 'error' && 'demo-console__status-pill--error',
                )}
              >
                {isActive && <span className="demo-console__status-dot" aria-hidden />}
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <span
              className={cn(
                'demo-console__latency',
                latencyGood && 'demo-console__latency--good',
              )}
            >
              <Zap size={10} aria-hidden />
              {latencyMs != null ? `${latencyMs}ms` : '— ms'}
              {latencyGood && ' ✓'}
            </span>
          </div>

          <div className={cn('demo-config', configOpen && 'demo-config--open')}>
            <button
              type="button"
              className="demo-config__toggle"
              onClick={() => setConfigOpen((o) => !o)}
              aria-expanded={configOpen}
            >
              <span>Agent & language</span>
              <ChevronDown size={16} className="demo-config__chevron" aria-hidden />
            </button>
            <div className="demo-config__body">
              <div className="demo-personas">
                <p className="demo-personas__label">Select agent persona</p>

                <div className="demo-personas__grid" role="radiogroup" aria-label="Agent persona">
                  {DEMO_PERSONAS.map((p) => {
                    const meta = PERSONA_META[p.id] ?? PERSONA_META.restaurant;
                    const Icon = meta.icon;
                    const selected = activePersonaId === p.id;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={isActive && !selected}
                        onClick={() => handlePersonaChange(p.id)}
                        className={cn('demo-persona-btn', selected && 'demo-persona-btn--active')}
                        style={{ '--demo-persona-color': meta.color } as React.CSSProperties}
                      >
                        <div className="demo-persona-btn__avatar">
                          <Icon size={16} aria-hidden />
                        </div>
                        <div>
                          <p className="demo-persona-btn__name">{p.name}</p>
                          <p className="demo-persona-btn__role">{p.tagline}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="demo-lang">
                <p className="demo-lang__label">Conversation language — Auto detects any language</p>

                <div className="demo-lang__grid" role="radiogroup" aria-label="Conversation language">
                  {LANGUAGE_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={languageMode === option.id}
                      disabled={isActive}
                      className={cn('demo-lang-btn', languageMode === option.id && 'demo-lang-btn--active')}
                      onClick={() => setLanguageMode(option.id)}
                    >
                      <span className="demo-lang-btn__name">{option.label}</span>
                      <span className="demo-lang-btn__hint">{option.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>



          <div ref={chatContainerRef} className="demo-chat" aria-live="polite" aria-relevant="additions">
            <div className="demo-chat__meta">Live transcript updates here during the call</div>

            {messages.length === 0 ? (

              <div className="demo-chat__empty">

                <div className="demo-chat__empty-ring">

                  <PersonaIcon className="demo-chat__empty-icon" aria-hidden />

                </div>

                <p className="demo-chat__empty-title">Ready to talk to {persona.name}</p>

                <p className="demo-chat__empty-sub">
                  Tap the mic below to start. {persona.name} will greet you, then listen for your voice and the transcript will appear here live.
                </p>

                {activePersonaId === 'restaurant' ? (
                  <div className="demo-nova-script">
                    <p className="demo-nova-script__label">Nova presents the demo</p>
                    <p className="demo-nova-script__text">
                      Start the call — Nova introduces Voiceify, then try a phrase below.
                    </p>
                    <ul className="demo-nova-script__steps">
                      {NOVA_DEMO_PROMPTS.map((step) => (
                        <li key={step.id}>
                          <strong>{step.label}</strong>
                          <span>&ldquo;{step.text}&rdquo;</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="demo-prompts">
                  <div className="demo-prompts__head">
                    <p className="demo-prompts__label">Try saying</p>
                    <span className="demo-prompts__count">{filteredPrompts.length} prompts</span>
                  </div>
                  <div className="demo-prompts__tabs" role="tablist" aria-label="Prompt categories">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={promptFilter === 'all'}
                      className={cn('demo-prompts__tab', promptFilter === 'all' && 'is-active')}
                      onClick={() => setPromptFilter('all')}
                    >
                      All
                    </button>
                    {promptCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={promptFilter === cat}
                        className={cn('demo-prompts__tab', promptFilter === cat && 'is-active')}
                        onClick={() => setPromptFilter(cat)}
                      >
                        {DEMO_PROMPT_CATEGORIES[cat]}
                      </button>
                    ))}
                  </div>
                  <div className="demo-prompts__list">
                    {filteredPrompts.map((prompt) => (
                      <div key={prompt.id} className="demo-prompt-chip">
                        <span className="demo-prompt-chip__meta">
                          <span className="demo-prompt-chip__cat">
                            {DEMO_PROMPT_CATEGORIES[prompt.category]}
                          </span>
                          <span className="demo-prompt-chip__lang">
                            {DEMO_LANG_LABELS[prompt.lang]}
                          </span>
                        </span>
                        <span className="demo-prompt-chip__title">{prompt.label}</span>
                        <span className="demo-prompt-chip__text">&ldquo;{prompt.text}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            ) : (

              <>

                {messages.map((log, i) => {

                  const label = displaySpeakerLabel(log.role, log.speakerLabel, persona.name);

                  const color = speakerColor(log.speakerId);

                  return (

                  <div

                    key={`${log.speakerId ?? log.role}-${i}`}

                    className={cn('demo-msg', log.role === 'user' ? 'demo-msg--user' : 'demo-msg--assistant')}

                    style={{ '--demo-speaker-color': color } as React.CSSProperties}

                  >

                    <div className="demo-msg__avatar" aria-hidden>

                      {label.slice(0, 2)}

                    </div>

                    <div
                      className={cn(
                        'demo-msg__bubble',
                        log.interrupted && 'demo-msg__bubble--interrupted',
                      )}
                    >

                      <span className="demo-msg__role">

                        {label}

                        {log.speakerId && log.speakerId !== 'agent' && log.speakerId !== 'speaker_0' && (

                          <span className="demo-msg__speaker-tag">{log.speakerId}</span>

                        )}

                        {log.interrupted && (
                          <span className="demo-msg__interrupt-tag">interrupted</span>
                        )}

                      </span>

                      {log.text}

                    </div>

                  </div>

                )})}

                {isActive && interimTranscript && status === 'listening' && (
                  <div className="demo-msg demo-msg--user demo-msg--interim">
                    <div className="demo-msg__avatar" aria-hidden>You</div>
                    <div className="demo-msg__bubble demo-msg__bubble--interim">
                      <span className="demo-msg__role">You · listening…</span>
                      {interimTranscript}
                    </div>
                  </div>
                )}

                {status === 'thinking' && (

                  <div className="demo-typing" aria-label={`${persona.name} is thinking`}>

                    <div className="demo-msg__avatar" aria-hidden>

                      {persona.name.slice(0, 2)}

                    </div>

                    <div className="demo-typing__dots">

                      <span className="demo-typing__dot" />

                      <span className="demo-typing__dot" />

                      <span className="demo-typing__dot" />

                    </div>

                  </div>

                )}

              </>

            )}

          </div>



          {error && (

            <div className="demo-error" role="alert">

              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden />

              <span>{error}</span>

            </div>

          )}

          {sttFallbackWarning && !error && (
            <div className="demo-error demo-error--warn" role="status">
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden />
              <span>{sttFallbackWarning}</span>
            </div>
          )}



          <div className="demo-controls">

            <div className="demo-controls__status-row">

              <span

                className={cn('demo-controls__status', isActive && 'demo-controls__status--live')}

              >

                {isActive && <span className="demo-controls__live-dot" aria-hidden />}

                {STATUS_LABELS[status] ?? status}

              </span>

              <span>

                {messages.length > 0 ? `${messages.length} messages` : 'Idle'}

              </span>

            </div>



            {latencyMs != null && (

              <div

                className="demo-latency-bar"

                role="progressbar"

                aria-valuenow={latencyMs}

                aria-valuemin={0}

                aria-valuemax={LATENCY_TARGET_MS}

                aria-label={`Latency ${latencyMs} milliseconds, target under ${LATENCY_TARGET_MS}`}

              >

                <div

                  className={cn('demo-latency-bar__fill', latencyGood && 'demo-latency-bar__fill--good')}

                  style={{ width: `${latencyPct}%` }}

                />

              </div>

            )}



            <p className="demo-controls__agent">
              Active: <strong>{persona.name}</strong> · {persona.accent} · {persona.languages}
            </p>

            {isActive && (
              <details className="demo-tech-details">
                <summary>Session details</summary>
                <p>
                  LLM: <strong>{groqEnabled ? 'Groq Llama 3.1' : geminiEnabled ? 'Gemini 2.5 Flash' : 'Pattern fallback'}</strong>
                  · STT: <strong>{scribeRealtimeEnabled ? 'Scribe Realtime v2' : 'Browser'}</strong>
                  · LID: <strong>{getLanguageLabel(activeLanguage)}</strong>
                  · Diarization: <strong>{diarizationEnabled ? 'Scribe v2 ON' : 'OFF'}</strong>
                  {!groqEnabled && !geminiEnabled && (
                    <>
                      {' '}
                      · <span className="demo-tech-details__warn">Add GROQ_API_KEY or GEMINI_API_KEY to .env.local</span>
                    </>
                  )}
                  {diarizationEnabled && activeSpeakers.length > 0 && (
                    <>
                      {' '}
                      · Speakers:{' '}
                      <strong>{activeSpeakers.filter((id) => id !== 'agent').length || 1}</strong>
                    </>
                  )}
                  {interruptCount > 0 && (
                    <>
                      {' '}
                      · Barge-ins: <strong>{interruptCount}</strong>
                    </>
                  )}
                </p>
              </details>
            )}



            <div

              ref={visualizerRef}

              className={cn('demo-visualizer', isLive && 'demo-visualizer--live')}

              aria-hidden="true"

            >

              {[...Array(24)].map((_, i) => (

                <div key={i} className="demo-visualizer__bar" />

              ))}

            </div>



            <div className="demo-controls__actions">

              <button

                type="button"

                onClick={resetConversation}

                className="demo-btn-reset"

                title="Reset conversation"

                aria-label="Reset conversation"

              >

                <RefreshCw size={18} aria-hidden />

              </button>



              <div className="demo-btn-mic-wrap">

                {ringClass && <span className={cn('demo-btn-mic-ring', ringClass)} aria-hidden />}

                <button

                  type="button"

                  onClick={toggleCall}

                  disabled={status === 'connecting'}

                  className={cn(

                    'demo-btn-mic',

                    isActive ? 'demo-btn-mic--end' : 'demo-btn-mic--start',

                  )}

                  aria-label={isActive ? 'End voice call' : 'Start voice call'}

                >

                  {isActive ? (

                    <Phone size={24} className="rotate-[135deg]" aria-hidden />

                  ) : (

                    <Mic size={24} aria-hidden />

                  )}

                </button>

              </div>

            </div>



            <p className="demo-controls__hint">{statusHint}</p>

            <p className="demo-controls__hint-sub">
              <Headphones size={12} aria-hidden className="demo-controls__hint-icon" />
              Headphones recommended — prevents speaker echo during the call.
            </p>

          </div>

        </div>

      </div>

    </div>

  );

}


