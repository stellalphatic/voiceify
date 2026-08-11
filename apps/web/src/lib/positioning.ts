/**
 * Single market pain point — landing, demo, personas, and prompts all thread through this.
 *
 * Industry: restaurants, clinics, SMB support (front-desk heavy teams).
 * Pain: phone rings during rush; staff can't answer; bookings & appointments lost;
 *       hours wasted on repeat callbacks.
 * Fix: voice agent picks up in <1s, resolves in one call, staff stays on the floor.
 */
export const CORE_PAIN_POINT = {
  label: 'Peak-hour phone overload',
  problem:
    'When your team is busiest (seating guests, checking in patients, closing tickets), the phone rings unanswered. Every missed call is a lost booking, an empty slot, or another hour on the callback loop.',
  solution:
    'Voiceify answers every call in under a second. Bookings, appointments, and tier-one support finish in one conversation, without pulling anyone off the floor.',
  outcome: '3+ hours back',
  outcomeDetail: 'for front-desk teams every day',
  callerBenefit: 'Callers never sit on hold or get sent to voicemail during rush hour.',
} as const;

export const POSITIONING = {
  eyebrow: 'Voice agents for real businesses',
  headline: 'Never miss a call when you\u2019re',
  headlineAccent: 'busiest',
  lead: CORE_PAIN_POINT.solution,
  subLead:
    'Deploy in minutes. English, Urdu, and 30 languages. Sub-500ms replies that sound human, not a phone tree from 2008.',
} as const;

export const PERSONA_TIME_SAVERS = {
  restaurant:
    'Answers every reservation call during dinner rush so your host never leaves the floor.',
  healthcare:
    'Books appointments while reception handles walk-ins so patients skip hold music.',
  support:
    'Closes tier-one tickets in one call so your team skips the callback queue.',
} as const;
