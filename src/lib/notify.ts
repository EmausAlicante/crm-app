// Outbound email via Resend's REST API (no SDK dependency — a single fetch call).
// Until RESEND_API_KEY is set this stays a no-op so the digest cron can run safely
// with nothing configured yet.
export const resendConfigured = !!process.env.RESEND_API_KEY;

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resendConfigured) return;
  const from = process.env.RESEND_FROM_EMAIL || "CRM MATIC <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}
