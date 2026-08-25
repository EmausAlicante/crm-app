import pool, { schemaReady } from "./db";
import type { Email } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEmail(row: any): Email {
  return {
    id: row.id,
    companyId: row.company_id,
    messageId: row.message_id,
    fromEmail: row.from_email,
    fromName: row.from_name,
    subject: row.subject,
    bodyPreview: row.body_preview,
    receivedAt: row.received_at,
    classification: row.classification,
    classificationReason: row.classification_reason,
    linkReason: row.link_reason,
    noteCreated: row.note_created,
    processedAt: row.processed_at,
    companyName: row.empresa ?? null,
    accountEmail: row.account_email,
  };
}

export type EmailFilters = { classification?: string; companyId?: number };

export async function listEmails(filters: EmailFilters = {}): Promise<Email[]> {
  await schemaReady;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.classification) {
    params.push(filters.classification);
    clauses.push(`e.classification = $${params.length}`);
  }
  if (filters.companyId) {
    params.push(filters.companyId);
    clauses.push(`e.company_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT e.*, c.empresa FROM emails e LEFT JOIN companies c ON c.id = e.company_id
     ${where} ORDER BY e.received_at DESC NULLS LAST, e.processed_at DESC`,
    params
  );
  return rows.map(rowToEmail);
}

export async function emailExists(messageId: string): Promise<boolean> {
  await schemaReady;
  const { rows } = await pool.query("SELECT 1 FROM emails WHERE message_id = $1", [messageId]);
  return rows.length > 0;
}

export async function createEmail(input: {
  companyId: number | null;
  messageId: string | null;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  bodyPreview: string | null;
  receivedAt: Date | null;
  classification: string | null;
  classificationReason: string | null;
  linkReason: string | null;
  noteCreated: boolean;
  accountEmail?: string | null;
}): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    `INSERT INTO emails (company_id, message_id, from_email, from_name, subject, body_preview,
       received_at, classification, classification_reason, link_reason, note_created, account_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (message_id) DO NOTHING
     RETURNING id`,
    [
      input.companyId, input.messageId, input.fromEmail, input.fromName, input.subject, input.bodyPreview,
      input.receivedAt, input.classification, input.classificationReason, input.linkReason, input.noteCreated,
      input.accountEmail ?? null,
    ]
  );
  return rows[0]?.id ?? null;
}

export type EmailStats = { total: number; porCategoria: Record<string, number>; sinVincular: number };

export async function getEmailStats(): Promise<EmailStats> {
  await schemaReady;
  const totalRes = await pool.query("SELECT COUNT(*)::int as c FROM emails");
  const catRes = await pool.query("SELECT classification, COUNT(*)::int as c FROM emails GROUP BY classification");
  const unlinkedRes = await pool.query("SELECT COUNT(*)::int as c FROM emails WHERE company_id IS NULL");
  const porCategoria: Record<string, number> = {};
  for (const r of catRes.rows as { classification: string; c: number }[]) porCategoria[r.classification] = r.c;
  return {
    total: totalRes.rows[0].c,
    porCategoria,
    sinVincular: unlinkedRes.rows[0].c,
  };
}
