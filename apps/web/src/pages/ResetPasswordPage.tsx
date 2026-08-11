import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { resetPassword } from '../lib/auth/client';
import ThemeToggle from '../components/ThemeToggle';
import '../auth.css';

const PROOF_CARDS = [
  {
    org: 'Front-desk teams',
    quote:
      'Peak-hour calls stop falling through. Bookings finish in one conversation while staff stays on the floor.',
    name: 'Clinic ops',
    role: 'Healthcare SMB',
  },
  {
    org: 'Restaurant groups',
    quote:
      'Dinner rush no longer means voicemail. Reservations land without pulling hosts off the pass.',
    name: 'Hospitality lead',
    role: 'Multi-location F&B',
  },
  {
    org: 'Support orgs',
    quote:
      'Tier-one tickets close on the first call. The team skips the callback queue and credits stay controlled.',
    name: 'CX director',
    role: 'B2B SaaS',
  },
] as const;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const errorParam = params.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    errorParam === 'INVALID_TOKEN' ? 'This reset link is invalid or expired.' : null,
  );
  const [done, setDone] = useState(false);
  const [proofIndex, setProofIndex] = useState(0);

  const canSubmit = useMemo(
    () => Boolean(token) && password.length >= 8 && password === confirm,
    [token, password, confirm],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setProofIndex((i) => (i + 1) % PROOF_CARDS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFormError('Missing reset token. Request a new password reset email.');
      return;
    }
    if (password.length < 8) {
      setFormError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setFormError(null);
    const result = await resetPassword({ token, newPassword: password });
    setLoading(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setDone(true);
    window.setTimeout(() => navigate('/auth?mode=signin'), 1600);
  };

  const proof = PROOF_CARDS[proofIndex];

  return (
    <main id="main-content" className="ap ap--vapi">
      <div className="ap-layout ap-layout--vapi">
        <section className="ap-form-side ap-form-side--vapi" aria-labelledby="reset-heading">
          <div className="ap-form-inner">
            <div className="ap-form-topbar">
              <Link to="/" className="ap-logo ap-logo--plain">
                voiceify
              </Link>
              <ThemeToggle size="sm" />
            </div>

            <header className="ap-header ap-header--vapi">
              <h1 className="ap-title" id="reset-heading">
                {done ? 'Password updated' : 'Set a new password'}
              </h1>
              <p className="ap-sub">
                {done
                  ? 'Redirecting you to sign in…'
                  : 'Choose a new password for your account. You will sign in again after this.'}
              </p>
            </header>

            {done ? (
              <div className="ap-form" role="status">
                <p className="ap-sub" style={{ marginBottom: 16 }}>
                  Your password was updated successfully.
                </p>
                <Link to="/auth?mode=signin" className="ap-submit">
                  Continue to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={(e) => void onSubmit(e)} className="ap-form" noValidate>
                {!token && (
                  <p className="ap-field-error" role="alert">
                    This page needs a valid reset link from your email.
                  </p>
                )}
                {formError && (
                  <p className="ap-field-error" role="alert">
                    {formError}
                  </p>
                )}

                <div className="ap-field">
                  <label htmlFor="reset-password" className="ap-label">
                    New password
                  </label>
                  <div className="ap-input-wrap">
                    <Lock size={16} className="ap-input-icon" aria-hidden />
                    <input
                      id="reset-password"
                      className="ap-input"
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                      required
                    />
                    <button
                      type="button"
                      className="ap-input-toggle"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="ap-field">
                  <label htmlFor="reset-confirm" className="ap-label">
                    Confirm password
                  </label>
                  <div className="ap-input-wrap">
                    <Lock size={16} className="ap-input-icon" aria-hidden />
                    <input
                      id="reset-confirm"
                      className="ap-input"
                      type={show ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="ap-submit"
                  disabled={loading || !canSubmit}
                >
                  {loading ? 'Saving…' : 'Update password'}
                </button>

                <div className="ap-footer-links">
                  <Link to="/auth?mode=signin">Back to sign in</Link>
                  <span className="ap-dot" aria-hidden>
                    ·
                  </span>
                  <Link to="/auth?mode=forgot">Request a new link</Link>
                </div>
              </form>
            )}

            <p className="ap-legal">
              <Link to="/terms">Terms of Service</Link>
              <span aria-hidden>·</span>
              <Link to="/privacy">Privacy</Link>
              <span aria-hidden>·</span>
              <Link to="/security">Security</Link>
            </p>
          </div>
        </section>

        <aside className="ap-showcase" aria-label="Customer outcomes">
          <div className="ap-showcase-grid" aria-hidden />
          <div className="ap-showcase-glow" aria-hidden />
          <article className="ap-proof-card" key={proofIndex}>
            <p className="ap-proof-org">{proof.org}</p>
            <blockquote className="ap-proof-quote">{proof.quote}</blockquote>
            <footer className="ap-proof-meta">
              <strong>{proof.name}</strong>
              <span>{proof.role}</span>
            </footer>
          </article>
          <div className="ap-proof-dots" aria-hidden>
            {PROOF_CARDS.map((_, i) => (
              <button
                key={PROOF_CARDS[i].org}
                type="button"
                className={`ap-proof-dot${i === proofIndex ? ' is-active' : ''}`}
                onClick={() => setProofIndex(i)}
                aria-label={`Show story ${i + 1}`}
              />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
