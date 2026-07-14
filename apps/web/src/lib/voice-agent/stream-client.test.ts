import { describe, it, expect, vi } from 'vitest';
import { consumeVoiceStream } from './stream-client';

function mockNdjsonResponse(lines: string[]): Response {
  const body = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      for (const line of lines) {
        controller.enqueue(enc.encode(`${line}\n`));
      }
      controller.close();
    },
  });
  return new Response(body);
}

describe('consumeVoiceStream', () => {
  it('parses valid NDJSON events', async () => {
    const events: string[] = [];
    await consumeVoiceStream(
      mockNdjsonResponse([
        JSON.stringify({ type: 'text', text: 'Hi', llmMs: 10 }),
        JSON.stringify({ type: 'done', totalMs: 100, ttfaMs: 50 }),
      ]),
      (e) => {
        events.push(e.type);
        return undefined;
      },
    );
    expect(events).toEqual(['text', 'done']);
  });

  it('skips malformed lines without crashing', async () => {
    const events: string[] = [];
    await consumeVoiceStream(
      mockNdjsonResponse(['not-json', JSON.stringify({ type: 'done', totalMs: 1, ttfaMs: 1 })]),
      (e) => {
        events.push(e.type);
      },
    );
    expect(events).toEqual(['done']);
  });

  it('throws on error events', async () => {
    await expect(
      consumeVoiceStream(
        mockNdjsonResponse([JSON.stringify({ type: 'error', message: 'Pipeline failed' })]),
        vi.fn(),
      ),
    ).rejects.toThrow('Pipeline failed');
  });
});
