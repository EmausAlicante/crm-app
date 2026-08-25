import pool from "./db";
import { domainOf, normalizeName } from "./importMatch";

export type EmailMatch = { companyId: number; reason: string } | null;

const GENERIC_DOMAINS = new Set([
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "live.com", "protonmail.com",
]);

export async function matchEmailToCompany(fromEmail: string, fromName: string | null): Promise<EmailMatch> {
  const emailLower = fromEmail.toLowerCase().trim();
  const domain = emailLower.split("@")[1] ?? null;

  const exact = await pool.query("SELECT id FROM companies WHERE lower(email) = $1 LIMIT 1", [emailLower]);
  if (exact.rows[0]) return { companyId: exact.rows[0].id, reason: "email exacto de la empresa" };

  const exactContact = await pool.query(
    "SELECT company_id FROM contacts WHERE lower(email) = $1 LIMIT 1",
    [emailLower]
  );
  if (exactContact.rows[0]) return { companyId: exactContact.rows[0].company_id, reason: "email exacto de un contacto" };

  if (domain && !GENERIC_DOMAINS.has(domain)) {
    const { rows } = await pool.query(
      "SELECT id, web, email FROM companies WHERE web IS NOT NULL OR email IS NOT NULL"
    );
    for (const c of rows as { id: number; web: string | null; email: string | null }[]) {
      const cDomain = domainOf(c.web) ?? (c.email ? c.email.split("@")[1]?.toLowerCase() : null);
      if (cDomain && cDomain === domain) return { companyId: c.id, reason: `mismo dominio (${domain})` };
    }
  }

  if (fromName) {
    const nameNorm = normalizeName(fromName);
    if (nameNorm.length > 3) {
      const { rows } = await pool.query("SELECT id, empresa FROM companies");
      for (const c of rows as { id: number; empresa: string }[]) {
        const eNorm = normalizeName(c.empresa);
        if (eNorm && eNorm.length > 3 && (nameNorm.includes(eNorm) || eNorm.includes(nameNorm))) {
          return { companyId: c.id, reason: "nombre de empresa en el remitente" };
        }
      }
    }
  }

  return null;
}
