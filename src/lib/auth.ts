import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool, { schemaReady } from "./db";

export const SESSION_COOKIE = "crm_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CODE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export type OtpDestinations = { email: string | null; phone: string | null };

export async function getOtpDestinations(): Promise<OtpDestinations> {
  await schemaReady;
  const { rows } = await pool.query("SELECT otp_email, otp_phone FROM app_settings WHERE id = 1");
  return { email: rows[0]?.otp_email ?? null, phone: rows[0]?.otp_phone ?? null };
}

export async function setOtpEmail(email: string | null): Promise<void> {
  await schemaReady;
  await pool.query("UPDATE app_settings SET otp_email = $1, updated_at = now() WHERE id = 1", [email]);
}

export async function setOtpPhone(phone: string | null): Promise<void> {
  await schemaReady;
  await pool.query("UPDATE app_settings SET otp_phone = $1, updated_at = now() WHERE id = 1", [phone]);
}

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString(); // always 6 digits
}

// Requesting a new code invalidates whatever was pending before — at most one
// valid code exists at a time, which keeps verification a single lookup.
export async function createLoginCode(): Promise<string> {
  await schemaReady;
  const code = generateCode();
  const hash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_DURATION_MS);
  await pool.query("DELETE FROM login_codes");
  await pool.query("INSERT INTO login_codes (code_hash, expires_at) VALUES ($1, $2)", [hash, expiresAt]);
  return code;
}

export async function verifyLoginCode(code: string): Promise<boolean> {
  await schemaReady;
  const { rows } = await pool.query(
    "SELECT code_hash FROM login_codes WHERE expires_at > now() ORDER BY created_at DESC LIMIT 1"
  );
  if (!rows[0]) return false;
  const ok = await bcrypt.compare(code, rows[0].code_hash);
  if (ok) await pool.query("DELETE FROM login_codes");
  return ok;
}

export async function createSession(): Promise<{ token: string; expiresAt: Date }> {
  await schemaReady;
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await pool.query("INSERT INTO sessions (token, expires_at) VALUES ($1, $2)", [token, expiresAt]);
  return { token, expiresAt };
}

// Checked against the DB on every request (see proxy.ts) rather than trusting
// a signed cookie alone — logging out takes effect immediately instead of
// waiting out a token's lifetime.
export async function isValidSession(token: string): Promise<boolean> {
  await schemaReady;
  const { rows } = await pool.query("SELECT 1 FROM sessions WHERE token = $1 AND expires_at > now()", [token]);
  return rows.length > 0;
}

export async function deleteSession(token: string): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}
