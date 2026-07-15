/**
 * AuthPage — sign in / sign up (minimal professional)
 * Demo auth: issues a local token via RequireAuth helpers.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Mic,
  Play,
} from 'lucide-react';
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.69 0 3.84-2.34 4.69-4.57 4.94.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12 22 6.48 17.52 2 12 2z" />
    </svg>
  );
}

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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (isSignUp) {
      if (!firstName.trim()) next.firstName = 'First name is required';
      if (!lastName.trim()) next.lastName = 'Last name is required';
    }

    if (!email.trim()) {
      next.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Enter a valid email address';
    }

    if (!isForgot) {
      if (!password) {
        next.password = 'Password is required';
      } else if (isSignUp && password.length < 8) {
        next.password = 'Use at least 8 characters';
      }
    }

    if (isSignUp && !agreed) {
      next.agreed = 'Please accept the terms to continue';
    }

    setErrors(next);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      agreed: true,
    });
    return Object.keys(next).length === 0;
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const result = await requestPasswordReset({
      email: email.trim(),
      redirectTo,
    });
    setLoading(false);
    if (!result.ok) {
      setErrors({ form: result.error });
      return;
    }
    // Always show success to avoid email enumeration
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
            name: `${firstName.trim()} ${lastName.trim()}`.trim() || email.trim(),
          })
        : await signInEmail({ email: email.trim(), password });

      if (!authResult.ok) {
        const msg = authResult.error;
        const isPending =
          /pending/i.test(msg) || /approval/i.test(msg) || /suspended/i.test(msg);
        if (isPending || (isSignUp && /pending|approval/i.test(msg))) {
          setPendingApproval(true);
          setErrors({});
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
        setErrors({ form: 'Signed in, but session could not be loaded. Try again.' });
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

      // Ensure the tenant user has an org (create default workspace on first login)
      try {
        const orgs = await apiJson<{
          organizations: Array<{ id: string }>;
        }>('/api/orgs');
        if (!orgs.organizations.length) {
          const created = await apiJson<{ organization: { id: string } }>(
            '/api/orgs',
            {
              method: 'POST',
              body: JSON.stringify({
                name: `${firstName.trim() || session.user.name.split(' ')[0] || 'My'} Workspace`,
              }),
            },
          );
          setActiveOrgId(created.organization.id);
        } else {
          setActiveOrgId(orgs.organizations[0].id);
        }
      } catch (orgErr) {
        const msg =
          orgErr instanceof Error ? orgErr.message : 'Unable to load workspace';
        if (/pending|approval|suspended|rejected/i.test(msg)) {
          setPendingApproval(true);
          setLoading(false);
          return;
        }
      }

      navigate(redirect ? decodeURIComponent(redirect) : '/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (/pending|approval|suspended|rejected/i.test(msg)) {
        setPendingApproval(true);
      } else {
        setErrors({ form: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <main id="main-content" className="ap">
      <div className="ap-bg" aria-hidden>
        <div className="ap-bg-glow" />
        <div className="ap-bg-glow ap-bg-glow--r" />
      </div>

      <div className="ap-layout">
        <aside className="ap-brand" aria-label="Voiceify overview">
          <div className="ap-brand-top">
            <Link to="/" className="ap-logo">
              <span className="ap-logo-icon">
                <Activity size={16} aria-hidden />
              </span>
              Voiceify
            </Link>
            <div className="ap-brand-actions">
              <ThemeToggle />
              <Link to="/" className="ap-back">
                <ArrowLeft size={14} aria-hidden />
                Back to site
              </Link>
            </div>
          </div>

          <div className="ap-brand-main">
            <h2 className="ap-brand-title">Voice agents for busy teams</h2>
            <p className="ap-brand-lead">
              Answer bookings, appointments, and support calls when your front desk can&apos;t.
              Start with 100 free minutes.
            </p>
            <Link to="/demo" className="ap-brand-link">
              Try the demo first
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </aside>

        <section className="ap-form-side" aria-labelledby="auth-heading">
          <div className="ap-mobile-top">
            <Link to="/" className="ap-logo">
              <span className="ap-logo-icon">
                <Activity size={16} aria-hidden />
              </span>
              Voiceify
            </Link>
            <div className="ap-brand-actions">
              <ThemeToggle />
              <Link to="/" className="ap-back">
                <ArrowLeft size={14} aria-hidden />
                Back
              </Link>
            </div>
          </div>

          <div className="ap-card">
            {!isForgot && (
              <nav
                className={`ap-tabs${isSignUp ? ' ap-tabs--signup' : ''}`}
                aria-label="Authentication mode"
              >
                <Link
                  to={tabHref('signin')}
                  className={`ap-tab${!isSignUp ? ' is-active' : ''}`}
                  aria-current={!isSignUp ? 'page' : undefined}
                >
                  Sign in
                </Link>
                <Link
                  to={tabHref('signup')}
                  className={`ap-tab${isSignUp ? ' is-active' : ''}`}
                  aria-current={isSignUp ? 'page' : undefined}
                >
                  Sign up
                </Link>
              </nav>
            )}

            <header className="ap-header">
              <h1 className="ap-title" id="auth-heading">
                {pendingApproval
                  ? 'Account pending approval'
                  : resetSent
                    ? 'Check your email'
                    : isForgot
                      ? 'Reset your password'
                      : isSignUp
                        ? 'Create your account'
                        : 'Welcome back'}
              </h1>
              <p className="ap-sub">
                {pendingApproval
                  ? 'A platform admin must approve your signup before you can sign in. You will be able to use the dashboard once approved.'
                  : resetSent
                    ? `If an account exists for ${email.trim()}, we sent a reset link. Check your inbox and spam folder.`
                    : isForgot
                      ? 'Enter your work email and we will send a secure reset link.'
                      : isSignUp
                        ? 'Start free with included credits. No card required.'
                        : 'Sign in to manage your voice agents and API keys.'}
              </p>
            </header>

            {pendingApproval && (
              <div className="ap-form" role="status">
                <p className="ap-field-error" style={{ color: 'inherit', opacity: 0.85 }}>
                  We saved your request for <strong>{email.trim() || 'your email'}</strong>.
                  Contact your Voiceify admin if you need faster access.
                </p>
                <Link to={tabHref('signin')} className="ap-submit" style={{ display: 'inline-flex', justifyContent: 'center', marginTop: 16 }}>
                  Back to sign in
                </Link>
              </div>
            )}

            {!pendingApproval && resetSent && (
              <div className="ap-form" role="status">
                <Link to={tabHref('signin')} className="ap-submit" style={{ display: 'inline-flex', justifyContent: 'center' }}>
                  Back to sign in
                </Link>
              </div>
            )}

            {!pendingApproval && !resetSent && (
            <form onSubmit={handleSubmit} className="ap-form" noValidate>
              {isSignUp && (
                <div className="ap-row">
                  <div className="ap-field">
                    <label htmlFor="auth-fname" className="ap-label">
                      First name
                    </label>
                    <input
                      id="auth-fname"
                      className={`ap-input ap-input--plain${touched.firstName && errors.firstName ? ' ap-input--error' : ''}`}
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => markTouched('firstName')}
                      placeholder="Jane"
                      required
                      autoComplete="given-name"
                      aria-invalid={Boolean(touched.firstName && errors.firstName)}
                    />
                    {touched.firstName && errors.firstName && (
                      <p className="ap-field-error" role="alert">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="ap-field">
                    <label htmlFor="auth-lname" className="ap-label">
                      Last name
                    </label>
                    <input
                      id="auth-lname"
                      className={`ap-input ap-input--plain${touched.lastName && errors.lastName ? ' ap-input--error' : ''}`}
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => markTouched('lastName')}
                      placeholder="Khan"
                      required
                      autoComplete="family-name"
                      aria-invalid={Boolean(touched.lastName && errors.lastName)}
                    />
                    {touched.lastName && errors.lastName && (
                      <p className="ap-field-error" role="alert">{errors.lastName}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="ap-field">
                <label htmlFor="auth-email" className="ap-label">
                  Work email
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
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    aria-invalid={Boolean(touched.email && errors.email)}
                  />
                </div>
                {touched.email && errors.email && (
                  <p className="ap-field-error" role="alert">{errors.email}</p>
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
                      Forgot password?
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
                    placeholder={isSignUp ? 'Min. 8 characters' : 'Enter your password'}
                    required
                    minLength={isSignUp ? 8 : undefined}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    aria-invalid={Boolean(touched.password && errors.password)}
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
                  <p className="ap-field-error" role="alert">{errors.password}</p>
                )}
                {isSignUp && password.length > 0 && (
                  <>
                    <div className="ap-pw-strength" aria-hidden>
                      {[1, 2, 3].map((level) => (
                        <span
                          key={level}
                          className={`ap-pw-strength-bar${passwordStrength >= level ? ` is-${passwordStrength}` : ''}`}
                        />
                      ))}
                    </div>
                    <p className="ap-pw-hint">
                      {STRENGTH_LABELS[passwordStrength]}
                      {passwordStrength < 3 && '. Use 12+ chars with numbers and uppercase'}
                    </p>
                  </>
                )}
              </div>
              )}

              {isSignUp ? (
                <div className="ap-field">
                  <label className="ap-check">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      onBlur={() => markTouched('agreed')}
                      required
                    />
                    <span className="ap-check-box" aria-hidden />
                    <span>
                      I agree to the{' '}
                      <Link to="/terms" className="ap-link">
                        Terms
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="ap-link">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {touched.agreed && errors.agreed && (
                    <p className="ap-field-error" role="alert">{errors.agreed}</p>
                  )}
                </div>
              ) : isForgot ? (
                <p className="ap-sub" style={{ marginTop: 0 }}>
                  <Link to={tabHref('signin')} className="ap-link">
                    Back to sign in
                  </Link>
                </p>
              ) : (
                <label className="ap-check">
                  <input type="checkbox" defaultChecked />
                  <span className="ap-check-box" aria-hidden />
                  <span>Keep me signed in on this device</span>
                </label>
              )}

              {errors.form && (
                <p className="ap-field-error" role="alert" style={{ marginBottom: 12 }}>
                  {errors.form}
                </p>
              )}

              <button type="submit" disabled={loading} className="ap-submit" id="auth-submit-btn">
                {loading ? (
                  <>
                    <span className="ap-spinner" aria-hidden />
                    {isForgot
                      ? 'Sending reset link…'
                      : isSignUp
                        ? 'Creating account…'
                        : 'Signing in…'}
                  </>
                ) : (
                  <>
                    {isForgot
                      ? 'Send reset link'
                      : isSignUp
                        ? 'Create free account'
                        : 'Sign in'}
                    <ArrowRight size={16} aria-hidden />
                  </>
                )}
              </button>
            </form>
            )}

            {!pendingApproval && !isForgot && !resetSent && (
              <>
                <div className="ap-divider">or continue with</div>

                <div className="ap-oauth">
                  <button type="button" className="ap-oauth-btn" id="auth-google-btn" disabled title="OAuth providers are not enabled yet">
                    <GoogleIcon />
                    Google
                  </button>
                  <button type="button" className="ap-oauth-btn" disabled title="OAuth providers are not enabled yet">
                    <GitHubIcon />
                    GitHub
                  </button>
                </div>

                <p className="ap-switch">
                  {isSignUp ? (
                    <>
                      Already have an account?{' '}
                      <Link to={tabHref('signin')}>Sign in</Link>
                    </>
                  ) : (
                    <>
                      New to Voiceify?{' '}
                      <Link to={tabHref('signup')}>Create a free account</Link>
                    </>
                  )}
                </p>
              </>
            )}

            <Link to="/demo" className="ap-demo-link">
              <Mic size={15} aria-hidden />
              Try live voice demo - no account needed
              <Play size={13} aria-hidden />
            </Link>

            {!isSignUp && !pendingApproval && (
              <p className="ap-fine">
                By continuing you agree to our{' '}
                <Link to="/terms" className="ap-link">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="ap-link">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
