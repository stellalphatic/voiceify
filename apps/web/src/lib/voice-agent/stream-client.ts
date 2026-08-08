export type VoiceStreamEvent =
  | { type: 'text'; text: string; llmMs: number; language?: string }
  | { type: 'ttfa'; ms: number }
  | { type: 'audio'; data: string }
  | { type: 'done'; totalMs: number; ttfaMs: number | null }
  | { type: 'error'; message: string };

function parseStreamLine(line: string): VoiceStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const event = JSON.parse(trimmed) as VoiceStreamEvent & { error?: string };
    if (!event || typeof event !== 'object' || !('type' in event)) return null;
    if (event.type === 'error') {
      const message =
        (typeof event.message === 'string' && event.message) ||
        (typeof event.error === 'string' && event.error) ||
        'Voice pipeline error';
      return { type: 'error', message };
    }
    return event;
  } catch {
    return null;
  }
}

export async function consumeVoiceStream(
  response: Response,
  onEvent: (event: VoiceStreamEvent) => void | Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      throw new DOMException('Aborted', 'AbortError');
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      // Re-check per line: a whole network chunk of already-buffered audio would
      // otherwise still be dispatched after an abort, bleeding the cancelled
      // utterance into the next one.
      if (signal?.aborted) {
        await reader.cancel().catch(() => undefined);
        throw new DOMException('Aborted', 'AbortError');
      }
      const event = parseStreamLine(line);
      if (!event) continue;
      await onEvent(event);
      if (event.type === 'error') throw new Error(event.message);
    }
  }

  const tail = parseStreamLine(buffer);
  if (tail) {
    await onEvent(tail);
    if (tail.type === 'error') throw new Error(tail.message);
  }
}
