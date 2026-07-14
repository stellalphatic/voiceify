export function speakerColor(speakerId?: string): string {
  switch (speakerId) {
    case 'agent':
      return '#525252';
    case 'customer':
    case 'speaker_0':
      return '#737373';
    case 'speaker_1':
      return '#a3a3a3';
    case 'speaker_2':
      return '#404040';
    case 'speaker_3':
      return '#262626';
    default:
      return '#8b949e';
  }
}

export function displaySpeakerLabel(
  role: 'user' | 'assistant',
  speakerLabel?: string,
  personaName?: string,
): string {
  if (role === 'assistant') return personaName ?? 'Agent';
  return speakerLabel ?? 'You';
}
