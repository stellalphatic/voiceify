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
        const alreadyExists = /already exists|already registered|USER_ALREADY_EXISTS/i.test(msg);
        if (isPending) {
          setPendingApproval(true);
          setErrors({});
        } else if (isSignUp && alreadyExists) {
          setErrors({
            form: 'An account with this email already exists. Sign in, or use Forgot password if you need access.',
          });
        } else {
          setErrors({ form: msg });
        }
        setLoading(false);
        return;
      }

      // Signup succeeds without a session when admin approval is required.
      const session = await getSession().catch(() => null);
      if (!session) {
        if (isSignUp) {
          setPendingApproval(true);
          setLoading(false);
          return;
        }
        setErrors({
          form: 'Sign-in blocked. If you just registered, wait for admin approval. Otherwise try Forgot password.',
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
            <p className="ap-brand-kicker">Production voice platform</p>
            <h2 className="ap-brand-title">Ship agents that actually answer the phone</h2>
            <p className="ap-brand-lead">
              Enterprise STT, LLM, and TTS in one pipeline. Approve teams, fund credits, and go live
              without bolting on a second auth vendor.
            </p>
            <ul className="ap-brand-points">
              <li>Custom voice pipeline (not a black-box agent wrapper)</li>
              <li>Org workspaces with credit controls</li>
              <li>Admin approval before production access</li>
            </ul>
            <Link to="/demo" className="ap-brand-link">
              Try the live demo
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
