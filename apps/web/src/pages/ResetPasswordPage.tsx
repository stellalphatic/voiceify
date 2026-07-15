import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { resetPassword } from "../lib/auth/client";
import ThemeToggle from "../components/ThemeToggle";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const errorParam = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    errorParam === "INVALID_TOKEN" ? "This reset link is invalid or expired." : null,
  );
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(token) && password.length >= 8 && password === confirm,
    [token, password, confirm],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFormError("Missing reset token. Request a new password reset email.");
      return;
    }
    if (password.length < 8) {
      setFormError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
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
    window.setTimeout(() => navigate("/auth?mode=signin"), 1600);
  };

  return (
    <main id="main-content" className="ap">
      <div className="ap-bg" aria-hidden>
        <div className="ap-bg-glow" />
      </div>
      <div className="ap-layout" style={{ justifyContent: "center" }}>
        <section className="ap-panel" style={{ maxWidth: 440, margin: "48px auto" }}>
          <div className="ap-panel-top">
            <Link to="/" className="ap-brand">
              Voiceify
            </Link>
            <ThemeToggle size="sm" />
          </div>
          <h1 className="ap-title">Set a new password</h1>
          <p className="ap-sub">
            Choose a new password for your account. You will sign in again after this.
          </p>

          {done ? (
            <p className="ap-success" role="status">
              Password updated. Redirecting to sign in…
            </p>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="ap-form">
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
                  <Lock size={16} aria-hidden />
                  <input
                    id="reset-password"
                    className="ap-input"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    className="ap-eye"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="ap-field">
                <label htmlFor="reset-confirm" className="ap-label">
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  className="ap-input"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                />
              </div>
              <button
                type="submit"
                className="ap-submit"
                disabled={loading || !canSubmit}
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          )}

          <p className="ap-switch">
            <Link to="/auth?mode=signin">Back to sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
