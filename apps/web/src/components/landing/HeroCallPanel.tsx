import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';

export type HeroPersonaId = 'restaurant' | 'healthcare' | 'support';

type Turn = {
  speaker: 'caller' | 'agent';
  text: string;
  /** Simulated round-trip shown on agent turns. */
  latencyMs?: number;
};

const SCRIPTS: Record<HeroPersonaId, { title: string; agent: string; turns: Turn[] }> = {
  restaurant: {
    title: 'Restaurant booking',
    agent: 'Nova',
    turns: [
      { speaker: 'caller', text: "Hi — can I get a table for two at 8 tonight?" },
      {
        speaker: 'agent',
        text: '8 PM for two — I can do that. Any seating preference?',
        latencyMs: 380,
      },
      { speaker: 'caller', text: 'Somewhere quiet if you have it.' },
      {
        speaker: 'agent',
        text: "Booked a corner booth at 8. I've texted the confirmation.",
        latencyMs: 410,
      },
    ],
  },
  healthcare: {
    title: 'Appointment desk',
    agent: 'Ayla',
    turns: [
      { speaker: 'caller', text: 'I need a checkup — anything on my lunch break?' },
      {
        speaker: 'agent',
        text: 'Dr. Rahim has 12:30 on Thursday. Does that work?',
        latencyMs: 350,
      },
      { speaker: 'caller', text: "That's perfect." },
      {
        speaker: 'agent',
        text: "You're set for Thursday 12:30. Reminder sent to your phone.",
        latencyMs: 395,
      },
    ],
  },
  support: {
    title: 'Tier-one support',
    agent: 'Kai',
    turns: [
      { speaker: 'caller', text: 'My invoice was charged twice this month.' },
      {
        speaker: 'agent',
        text: 'I see the duplicate charge from the 3rd. Refunding it now.',
        latencyMs: 420,
      },
      { speaker: 'caller', text: 'How long does that take?' },
      {
        speaker: 'agent',
        text: 'Back on your card in 3 business days. Receipt is on its way.',
        latencyMs: 365,
      },
    ],
  },
};

const TYPING_MS_PER_CHAR = 18;
const CALLER_READ_MS = 1100;
const AGENT_PAUSE_MS = 520;

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scripted call simulation for the hero. Advances one turn at a time, typing out
 * agent replies, and idles when scrolled out of view so it never burns frames in
 * the background.
 */
export default function HeroCallPanel({ persona }: { persona: HeroPersonaId }) {
  const script = SCRIPTS[persona];
  const reduceMotion = useMemo(prefersReducedMotion, []);

  const [visibleTurns, setVisibleTurns] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [runId, setRunId] = useState(0);
  const [inView, setInView] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);

  // Restart the script whenever the persona changes or the user replays.
  useEffect(() => {
    setVisibleTurns(reduceMotion ? script.turns.length : 0);
    setTypedChars(0);
    setElapsed(0);
  }, [persona, runId, reduceMotion, script.turns.length]);

  useEffect(() => {
    const node = panelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const done = visibleTurns >= script.turns.length;
  const currentTurn = done ? null : script.turns[visibleTurns];
  const isTyping = Boolean(currentTurn && currentTurn.speaker === 'agent');

  // Turn scheduler: caller lines appear whole, agent lines type character by character.
  useEffect(() => {
    if (reduceMotion || done || !inView || !currentTurn) return;

    if (currentTurn.speaker === 'caller') {
      const timer = window.setTimeout(() => {
        setVisibleTurns((n) => n + 1);
        setTypedChars(0);
      }, CALLER_READ_MS);
      return () => window.clearTimeout(timer);
    }

    if (typedChars < currentTurn.text.length) {
      const timer = window.setTimeout(
        () => setTypedChars((n) => Math.min(n + 2, currentTurn.text.length)),
        TYPING_MS_PER_CHAR,
      );
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setVisibleTurns((n) => n + 1);
      setTypedChars(0);
    }, AGENT_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [currentTurn, typedChars, done, inView, reduceMotion]);

  // Call timer, frozen once the script completes.
  useEffect(() => {
    if (reduceMotion || done || !inView) return;
    const interval = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [done, inView, reduceMotion]);

  const settled = script.turns.slice(0, visibleTurns);
  const partial =
    currentTurn && currentTurn.speaker === 'agent' && typedChars > 0
      ? currentTurn.text.slice(0, typedChars)
      : null;

  const lastLatency = [...settled].reverse().find((t) => t.latencyMs)?.latencyMs;
  const timeLabel = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(
    elapsed % 60,
  ).padStart(2, '0')}`;

  return (
    <div className="lp-livecall" ref={panelRef}>
      <div className="lp-livecall-head">
        <span className={`lp-livecall-status${done ? ' is-done' : ''}`}>
          <span className="lp-livecall-dot" aria-hidden />
          {done ? 'Call complete' : 'Live call'}
        </span>
        <span className="lp-livecall-meta">
          {script.title}
          <span className="lp-livecall-timer">{timeLabel}</span>
        </span>
      </div>

      <div className="lp-livecall-body" aria-live="polite" aria-atomic="false">
        {settled.map((turn, index) => (
          <div
            key={`${persona}-${runId}-${index}`}
            className={`lp-livecall-turn lp-livecall-turn--${turn.speaker}`}
          >
            <span className="lp-livecall-who">
              {turn.speaker === 'caller' ? 'Caller' : script.agent}
            </span>
            <p className="lp-livecall-bubble">{turn.text}</p>
            {turn.latencyMs ? (
              <span className="lp-livecall-latency">{turn.latencyMs} ms</span>
            ) : null}
          </div>
        ))}

        {partial ? (
          <div className="lp-livecall-turn lp-livecall-turn--agent">
            <span className="lp-livecall-who">{script.agent}</span>
            <p className="lp-livecall-bubble">
              {partial}
              <span className="lp-livecall-caret" aria-hidden />
            </p>
          </div>
        ) : null}
      </div>

      <div className="lp-livecall-foot">
        <span className={`lp-livecall-wave${isTyping ? ' is-active' : ''}`} aria-hidden>
          {Array.from({ length: 18 }).map((_, index) => (
            <i key={index} style={{ '--i': index } as React.CSSProperties} />
          ))}
        </span>

        <span className="lp-livecall-foot-text">
          {done
            ? lastLatency
              ? `Resolved in ${timeLabel} · ${lastLatency} ms replies`
              : `Resolved in ${timeLabel}`
            : isTyping
              ? `${script.agent} is replying…`
              : 'Listening…'}
        </span>

        <span className="lp-livecall-actions">
          {done && !reduceMotion ? (
            <button
              type="button"
              className="lp-livecall-replay"
              onClick={() => setRunId((n) => n + 1)}
            >
              <RotateCcw size={13} aria-hidden />
              Replay
            </button>
          ) : null}
          <Link to={`/demo?persona=${persona}`} className="lp-livecall-link">
            Open demo
            <ArrowRight size={13} aria-hidden />
          </Link>
        </span>
      </div>
    </div>
  );
}
