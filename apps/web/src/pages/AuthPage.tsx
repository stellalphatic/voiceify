/**
 * Auth — Vapi-inspired split: lean form (left) + animated social proof (right).
 * Email/password only (Better Auth). No fake OAuth.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { setAuthToken } from '../components/RequireAuth';
import {
  apiJson,
  getSession,
  requestPasswordReset,
  resolvePostAuthHome,
  setActiveOrgId,
  signInEmail,
  signUpEmail,
} from '../lib/auth/client';
import ThemeToggle from '../components/ThemeToggle';

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

function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  if (password.length < 8) return 1;
  const hasMix = /[A-Z]/.test(password) && /[0-9]/.test(password);
  if (password.length < 12 || !hasMix) return 2;
  return 3;
}

const STRENGTH_LABELS = ['', 'Too short', 'Good', 'Strong'] as const;

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') || 'signin';
  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';
  const redirect = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [proofIndex, setProofIndex] = useState(0);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const tabHref = (nextMode: 'signin' | 'signup' | 'forgot') => {
    const params = new URLSearchParams();
    params.set('mode', nextMode);
    if (redirect) params.set('redirect', redirect);
    return `/auth?${params.toString()}`;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setErrors({});
    setTouched({});
    setResetSent(false);
  }, [isSignUp, isForgot]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setProofIndex((i) => (i + 1) % PROOF_CARDS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (isSignUp && !fullName.trim()) next.fullName = 'Name is required';
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email';
    if (!isForgot) {
      if (!password) next.password = 'Password is required';
      else if (isSignUp && password.length < 8) next.password = 'Use at least 8 characters';
    }
    if (isSignUp && !agreed) next.agreed = 'Accept the terms to continue';
    setErrors(next);
    setTouched({ fullName: true, email: true, password: true, agreed: true });
    return Object.keys(next).length === 0;
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    const result = await requestPasswordReset({
      email: email.trim(),
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (!result.ok) {
      setErrors({ form: result.error });
      return;
    }
    setResetSent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgot) {
      await handleForgot(e);
      return;
    }
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      const authResult = isSignUp
        ? await signUpEmail({
            email: email.trim(),
            password,
            name: fullName.trim() || email.trim(),
          })
        : await signInEmail({ email: email.trim(), password });

      if (!authResult.ok) {
        const msg = authResult.error;
        const isPending =
          /pending/i.test(msg) || /approval/i.test(msg) || /suspended/i.test(msg);
        const alreadyExists =
          /already exists|already registered|USER_ALREADY_EXISTS/i.test(msg);
        if (isPending) {
          setPendingApproval(true);
          setErrors({});
        } else if (isSignUp && alreadyExists) {
          setErrors({
            form: 'An account with this email already exists. Sign in, or use Forgot password.',
          });
        } else {
          setErrors({ form: msg });
        }
        setLoading(false);
        return;
      }

      const session = await getSession().catch(() => null);
      if (!session) {
        if (isSignUp) {
          setPendingApproval(true);
          setLoading(false);
          return;
        }
        setErrors({
          form: 'Sign-in blocked. If you just registered, wait for admin approval.',
        });
        setLoading(false);
        return;
      }

      setAuthToken(session.session.id);
      const home = await resolvePostAuthHome();
      if (home === '/admin') {
        navigate(redirect ? decodeURIComponent(redirect) : '/admin');
        setLoading(false);
        return;
      }

      try {
        const orgs = await apiJson<{ organizations: Array<{ id: string }> }>('/api/orgs');
        if (!orgs.organizations.length) {
          const created = await apiJson<{ organization: { id: string } }>('/api/orgs', {
            method: 'POST',
            body: JSON.stringify({
              name: `${fullName.trim().split(' ')[0] || 'My'} Workspace`,
            }),
          });
          setActiveOrgId(created.organization.id);
        } else {
          setActiveOrgId(orgs.organizations[0].id);
        }
      } catch (orgErr) {
        const msg = orgErr instanceof Error ? orgErr.message : 'Unable to load workspace';
        if (/pending|approval|suspended|rejected/i.test(msg)) {
          setPendingApproval(true);
          setLoading(false);
          return;
        }
      }

      navigate(redirect ? decodeURIComponent(redirect) : '/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (/pending|approval|suspended|rejected/i.test(msg)) setPendingApproval(true);
      else setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const proof = PROOF_CARDS[proofIndex];

  return (
    <main id="main-content" className="ap ap--vapi">
      <div className="ap-layout ap-layout--vapi">
        {/* LEFT — form */}
        <section className="ap-form-side ap-form-side--vapi" aria-labelledby="auth-heading">
          <div className="ap-form-inner">
            <div className="ap-form-topbar">
              <Link to="/" className="ap-logo ap-logo--plain">
                voiceify
              </Link>
              <ThemeToggle size="sm" />
            </div>

            <header className="ap-header ap-header--vapi">
              <h1 className="ap-title" id="auth-heading">
                {pendingApproval
                  ? 'Pending approval'
                  : resetSent
                    ? 'Check your email'
                    : isForgot
                      ? 'Reset password'
                      : isSignUp
                        ? 'Create your account'
                        : 'Sign into your account'}
              </h1>
              <p className="ap-sub">
                {pendingApproval
                  ? 'A platform admin must approve your signup before you can sign in.'
                  : resetSent
                    ? `If an account exists for ${email.trim()}, we sent a reset link.`
                    : isForgot
                      ? 'Enter your email and we will send a secure reset link.'
                      : isSignUp
                        ? 'Manage voice agents, credits, and API keys in one workspace.'
                        : 'Easily manage your voice agents all in one dashboard.'}
              </p>
            </header>

            {pendingApproval && (
              <div className="ap-form" role="status">
                <p className="ap-banner">
                  We saved your request for <strong>{email.trim() || 'your email'}</strong>.
                </p>
                <Link to={tabHref('signin')} className="ap-submit">
                  Back to sign in
                </Link>
              </div>
            )}

            {resetSent && !pendingApproval && (
              <div className="ap-form" role="status">
                <Link to={tabHref('signin')} className="ap-submit">
                  Back to sign in
                </Link>
              </div>
            )}

            {!pendingApproval && !resetSent && (
              <form onSubmit={(e) => void handleSubmit(e)} className="ap-form" noValidate>
                {isSignUp && (
                  <div className="ap-field">
                    <label htmlFor="auth-name" className="ap-label">
                      Full name
                    </label>
                    <input
                      id="auth-name"
                      className={`ap-input ap-input--plain${touched.fullName && errors.fullName ? ' ap-input--error' : ''}`}
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => markTouched('fullName')}
                      placeholder="Alex Morgan"
                      autoComplete="name"
                    />
                    {touched.fullName && errors.fullName && (
                      <p className="ap-field-error" role="alert">
                        {errors.fullName}
                      </p>
                    )}
                  </div>
                )}

                <div className="ap-field">
                  <label htmlFor="auth-email" className="ap-label">
                    Email
                  </label>
                  <div className="ap-input-wrap">
                    <Mail size={16} className="ap-input-icon" aria-hidden />
                    <input
                      id="auth-email"
                      className={`ap-input${touched.email && errors.email ? ' ap-input--error' : ''}`}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => markTouched('email')}
                      placeholder="Your email address"
                      autoComplete="email"
                      required
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="ap-field-error" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                {!isForgot && (
                  <div className="ap-field">
                    <div className="ap-label-row">
                      <label htmlFor="auth-password" className="ap-label">
                        Password
                      </label>
                      {!isSignUp && (
                        <Link to={tabHref('forgot')} className="ap-forgot">
                          Forgot your password?
                        </Link>
                      )}
                    </div>
                    <div className="ap-input-wrap">
                      <Lock size={16} className="ap-input-icon" aria-hidden />
                      <input
                        id="auth-password"
                        className={`ap-input${touched.password && errors.password ? ' ap-input--error' : ''}`}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => markTouched('password')}
                        placeholder="Your password"
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        required
                      />
                      <button
                        type="button"
                        className="ap-input-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {touched.password && errors.password && (
                      <p className="ap-field-error" role="alert">
                        {errors.password}
                      </p>
                    )}
                    {isSignUp && password.length > 0 && (
                      <p className="ap-pw-hint">
                        {STRENGTH_LABELS[passwordStrength]}
                        {passwordStrength < 3 && '. Use 12+ chars with numbers and uppercase'}
                      </p>
                    )}
                  </div>
                )}

                {isSignUp && (
                  <label className="ap-check">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      onBlur={() => markTouched('agreed')}
                    />
                    <span className="ap-check-box" aria-hidden />
                    <span>
                      I agree to the <Link to="/terms" className="ap-link">Terms</Link> and{' '}
                      <Link to="/privacy" className="ap-link">Privacy Policy</Link>
                    </span>
                  </label>
                )}

                {errors.agreed && touched.agreed && (
                  <p className="ap-field-error" role="alert">
                    {errors.agreed}
                  </p>
                )}
                {errors.form && (
                  <p className="ap-field-error" role="alert">
                    {errors.form}
                  </p>
                )}

                <button type="submit" disabled={loading} className="ap-submit" id="auth-submit-btn">
                  {loading
                    ? isForgot
                      ? 'Sending…'
                      : isSignUp
                        ? 'Creating…'
                        : 'Signing in…'
                    : isForgot
                      ? 'Send reset link'
                      : isSignUp
                        ? 'Create account'
                        : 'Sign in'}
                </button>

                <div className="ap-footer-links">
                  {isForgot ? (
                    <Link to={tabHref('signin')}>Back to sign in</Link>
                  ) : isSignUp ? (
                    <>
                      Already have an account? <Link to={tabHref('signin')}>Sign in</Link>
                    </>
                  ) : (
                    <>
                      <Link to={tabHref('signup')}>Sign up</Link>
                      <span className="ap-dot" aria-hidden>
                        ·
                      </span>
                      <Link to={tabHref('forgot')}>Forgot your password?</Link>
                    </>
                  )}
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

        {/* RIGHT — animated proof */}
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
