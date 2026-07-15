/**
 * Transactional email via Resend (password reset, admin notifications).
 */

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Strip wrapping quotes that break keys when .env uses RESEND_API_KEY="re_..." badly. */
export function cleanEnvValue(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function getResendConfig(): {
  apiKey: string;
  from: string;
  configured: boolean;
} {
  const apiKey = cleanEnvValue(process.env.RESEND_API_KEY);
  const from =
    cleanEnvValue(process.env.RESEND_FROM_EMAIL) ||
    "Voiceify <onboarding@resend.dev>";
  return { apiKey, from, configured: Boolean(apiKey) };
}

export function isEmailConfigured(): boolean {
  return getResendConfig().configured;
}

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const { apiKey, from, configured } = getResendConfig();

  if (!configured) {
    console.warn(
      "[voiceify/email] RESEND_API_KEY missing — email not sent:",
      input.subject,
      "→",
      input.to,
    );
    return { ok: false, error: "Email service is not configured (RESEND_API_KEY)" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const bodyText = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[voiceify/email] Resend error", res.status, bodyText);
      return {
        ok: false,
        error: `Resend ${res.status}: ${bodyText.slice(0, 280) || res.statusText}`,
      };
    }

    let id: string | undefined;
    try {
      const parsed = JSON.parse(bodyText) as { id?: string };
      id = parsed.id;
    } catch {
      /* ignore */
    }
    console.info("[voiceify/email] sent", {
      to: input.to,
      subject: input.subject,
      from,
      id: id ?? null,
    });
    return { ok: true, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("[voiceify/email] network error", message);
    return { ok: false, error: message };
  }
}

export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "Reset your Voiceify password";
  const text = `Hi ${params.name},\n\nReset your password:\n${params.resetUrl}\n\nIf you did not request this, you can ignore this email.\n`;
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>We received a request to reset your Voiceify password.</p>
      <p><a href="${escapeAttr(params.resetUrl)}" style="display:inline-block;padding:10px 16px;background:#0d9488;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p>
      <p style="color:#555;font-size:14px">Or paste this link into your browser:<br/>${escapeHtml(params.resetUrl)}</p>
      <p style="color:#555;font-size:14px">If you did not request this, you can ignore this email.</p>
    </div>
  `;
  return { subject, html, text };
}

export function pendingSignupAdminEmail(params: {
  userEmail: string;
  userName: string;
  adminUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Voiceify signup pending: ${params.userEmail}`;
  const text = `New signup awaiting approval:\nName: ${params.userName}\nEmail: ${params.userEmail}\nApprove at: ${params.adminUrl}\n`;
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <p>New Voiceify signup is waiting for approval.</p>
      <p><strong>${escapeHtml(params.userName)}</strong><br/>${escapeHtml(params.userEmail)}</p>
      <p><a href="${escapeAttr(params.adminUrl)}">Open admin portal</a></p>
    </div>
  `;
  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
