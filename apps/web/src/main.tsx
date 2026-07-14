import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
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
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Geist', 'Inter', sans-serif",
          gap: '16px',
          padding: '32px',
        }}>
          <h1 style={{ color: 'var(--color-accent)', fontSize: '2rem', margin: 0 }}>Something went wrong</h1>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', textAlign: 'center' }}>
            A runtime error occurred. Check the browser console for details.
          </p>
          <pre style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0',
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
              background: 'var(--color-accent)',
              color: 'var(--color-text-primary)',
              border: 'none',
              borderRadius: '0',
              padding: '10px 24px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload Page
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
