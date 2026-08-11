import { ArrowLeft, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <main id="main-content" className="min-h-[70vh] px-6 py-24">
      <div className="mx-auto max-w-xl rounded-2xl border border-voice-frost-border bg-voice-surface p-8 text-center shadow-sm sm:p-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-voice-accent">
          404
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-voice-text">
          Page not found
        </h1>
        <p className="mx-auto mb-7 max-w-md text-voice-muted">
          There is no Voiceify page at <code>{location.pathname}</code>. The link may be
          outdated or the address may have been mistyped.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-primary inline-flex items-center justify-center gap-2">
            <Home size={16} aria-hidden />
            Go home
          </Link>
          <button
            type="button"
            className="btn-secondary inline-flex items-center justify-center gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} aria-hidden />
            Go back
          </button>
        </div>
      </div>
    </main>
  );
}
