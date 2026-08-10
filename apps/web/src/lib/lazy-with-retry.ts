import { lazy, type ComponentType } from 'react';

type PageModule = { default: ComponentType };

const RELOAD_FLAG = 'voiceify:chunk-reloaded';

/** sessionStorage throws in private/sandboxed contexts, so never let it break routing. */
function readFlag(): boolean {
  try {
    return window.sessionStorage.getItem(RELOAD_FLAG) === '1';
  } catch {
    return true; // Cannot track a retry, so do not risk a reload loop.
  }
}

function writeFlag(value: boolean): void {
  try {
    if (value) window.sessionStorage.setItem(RELOAD_FLAG, '1');
    else window.sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

/**
 * Route-level code splitting keyed by content hash means a deploy renames every
 * chunk. Tabs still running the previous build then request filenames that no
 * longer exist and crash on navigation. Reload once so the browser picks up the
 * new index.html and its new chunk names; if it fails again the error is real
 * and propagates to the error boundary.
 */
export function lazyWithRetry(factory: () => Promise<PageModule>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      writeFlag(false);
      return mod;
    } catch (error) {
      if (isChunkLoadError(error) && !readFlag()) {
        writeFlag(true);
        window.location.reload();
        // The reload tears down this document, so never resolve.
        return new Promise<PageModule>(() => {});
      }
      throw error;
    }
  });
}
