import { useEffect } from 'react';
import { enablePixelUi } from '../lib/theme';

/** Ensures pixel UI flag is on (also set in index.html bootstrap). */
export function usePixelUi() {
  useEffect(() => {
    enablePixelUi();
  }, []);
}
