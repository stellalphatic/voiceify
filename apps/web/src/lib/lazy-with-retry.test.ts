import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isChunkLoadError, lazyWithRetry } from './lazy-with-retry';

/** React.lazy stores the loader on the returned object; call it directly. */
type LazyInternals = { _payload: { _result: () => Promise<unknown> } };
function loaderOf(component: unknown): () => Promise<unknown> {
  return (component as unknown as LazyInternals)._payload._result;
}

describe('isChunkLoadError', () => {
  it('recognises the browser messages for a missing chunk', () => {
    expect(
      isChunkLoadError(
        new Error(
          'Failed to fetch dynamically imported module: https://x/assets/DashboardLayout-CcFOAZCq.js',
        ),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('ChunkLoadError: loading chunk 3 failed'))).toBe(true);
  });

  it('does not claim ordinary errors are chunk failures', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false);
  });
});

describe('lazyWithRetry', () => {
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.sessionStorage.clear();
    reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  it('passes the module through when the import succeeds', async () => {
    const mod = { default: () => null };
    const component = lazyWithRetry(() => Promise.resolve(mod));
    await expect(loaderOf(component)()).resolves.toBe(mod);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once when a chunk is missing after a deploy', async () => {
    const component = lazyWithRetry(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/x.js')),
    );
    let settled = false;
    void loaderOf(component)().then(() => {
      settled = true;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(reload).toHaveBeenCalledTimes(1);
    // Must never resolve, otherwise React renders while the document unloads.
    expect(settled).toBe(false);
    expect(window.sessionStorage.getItem('voiceify:chunk-reloaded')).toBe('1');
  });

  it('rethrows instead of looping when the reload did not help', async () => {
    window.sessionStorage.setItem('voiceify:chunk-reloaded', '1');
    const component = lazyWithRetry(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/x.js')),
    );
    await expect(loaderOf(component)()).rejects.toThrow('Failed to fetch');
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload for errors that are not chunk failures', async () => {
    const component = lazyWithRetry(() => Promise.reject(new Error('boom')));
    await expect(loaderOf(component)()).rejects.toThrow('boom');
    expect(reload).not.toHaveBeenCalled();
  });

  it('clears the retry flag after a later success so the next deploy can recover', async () => {
    window.sessionStorage.setItem('voiceify:chunk-reloaded', '1');
    const component = lazyWithRetry(() => Promise.resolve({ default: () => null }));
    await loaderOf(component)();
    expect(window.sessionStorage.getItem('voiceify:chunk-reloaded')).toBeNull();
  });
});
