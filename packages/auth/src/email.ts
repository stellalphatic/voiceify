/**
 * Transactional email via Resend (password reset, admin notifications).
 * No-ops with a clear log when RESEND_API_KEY is unset (local/dev).
 */

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Voiceify <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(
      "[voiceify/email] RESEND_API_KEY missing — email not sent:",
      input.subject,
      "→",
      input.to,
    );
    return { ok: false, error: "Email service is not configured" };
  }

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

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[voiceify/email] Resend error", res.status, body);
    return { ok: false, error: `Email send failed (${res.status})` };
  }

  return { ok: true };
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
