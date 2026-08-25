"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createLoginCode,
  createSession,
  deleteSession,
  getOtpDestinations,
  setOtpEmail,
  verifyLoginCode,
  SESSION_COOKIE,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { resendConfigured, sendEmail } from "@/lib/notify";

function nextQs(next: string): string {
  return next ? `&next=${encodeURIComponent(next)}` : "";
}

export async function requestCodeAction(formData: FormData) {
  const emailInput = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "");
  const qs = nextQs(next);

  // sendEmail() silently no-ops without this — fail loudly instead of
  // pretending a code was sent when nothing will ever arrive.
  if (!resendConfigured) redirect(`/login?error=1&noemail=1${qs}`);

  // Cheap floor against spamming the inbox / burning email-send quota.
  const allowed = await checkRateLimit("send-login-code", 30);
  if (!allowed) redirect(`/login?error=1${qs}`);

  let { email, phone } = await getOtpDestinations();

  // Bootstrap: nothing registered yet means there's no way to reach the
  // settings page (it's behind this same gate) to configure one — so the
  // first email submitted here becomes the permanent destination.
  if (!email && !phone) {
    if (!emailInput || !emailInput.includes("@")) redirect(`/login?error=1${qs}`);
    await setOtpEmail(emailInput);
    email = emailInput;
  }

  const code = await createLoginCode();
  if (email) {
    await sendEmail(
      email,
      "Tu código de acceso — CRM MATIC",
      `<p>Tu código de acceso es:</p><p style="font-size:28px;font-weight:600;letter-spacing:4px">${code}</p><p>Caduca en 10 minutos. Si no lo has pedido tú, ignora este email.</p>`
    );
  }
  // Phone/SMS destination isn't wired to a provider yet — email is the only
  // channel actually sent until one is configured.

  redirect(`/login?sent=1${qs}`);
}

export async function verifyCodeAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const next = String(formData.get("next") ?? "");
  const qs = nextQs(next);
  const failUrl = `/login?sent=1&error=1${qs}`;

  if (!code) redirect(failUrl);

  // Tighter floor than login-by-password would need — a 6-digit code only
  // has 1M combinations, so unlimited guesses would be brute-forceable.
  const allowed = await checkRateLimit("verify-login-code", 2);
  if (!allowed) redirect(failUrl);

  const ok = await verifyLoginCode(code);
  if (!ok) redirect(failUrl);

  const { token, expiresAt } = await createSession();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  redirect(next && next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
