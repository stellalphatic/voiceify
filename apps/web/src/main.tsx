import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { isChunkLoadError } from './lib/lazy-with-retry';
import './index.css';

/* ── Root Error Boundary ──────────────────────────────────────
   Catches any unhandled React render errors and shows a human-
   readable fallback instead of a blank page.
   ─────────────────────────────────────────────────────────── */
interface EBState { error: Error | null }
interface EBProps { children: ReactNode }
class RootErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  render() {
    if (this.state.error) {
      const staleBuild = isChunkLoadError(this.state.error);
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "var(--font-ui, 'Inter', sans-serif)",
          gap: '16px',
          padding: '32px',
        }}>
          <h1 style={{ color: 'var(--color-accent)', fontSize: '2rem', margin: 0 }}>
            {staleBuild ? 'A new version is available' : 'Something went wrong'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', textAlign: 'center' }}>
            {staleBuild
              ? 'This page was loaded from an older release. Reload to continue on the latest version.'
              : 'A runtime error occurred. Check the browser console for details.'}
          </p>
          <pre style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px 24px',
            color: 'var(--color-voice-danger)',
            fontSize: '0.8rem',
            maxWidth: '700px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--color-brand-primary)',
              color: 'var(--color-voice-on-accent, #ffffff)',
              border: 'none',
              borderRadius: '9999px',
              padding: '10px 24px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {staleBuild ? 'Reload' : 'Reload Page'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
