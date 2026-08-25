import pool, { schemaReady } from "./db";
import type { EmailAccount } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAccount(row: any): EmailAccount {
  return {
    id: row.id,
    label: row.label,
    email: row.email,
    imapHost: row.imap_host,
    imapPort: row.imap_port,
    activo: row.activo,
    createdAt: row.created_at,
  };
}

export async function listEmailAccounts(): Promise<EmailAccount[]> {
  await schemaReady;
  const { rows } = await pool.query(
    "SELECT id, label, email, imap_host, imap_port, activo, created_at FROM email_accounts ORDER BY created_at ASC"
  );
  return rows.map(rowToAccount);
}

export type EmailAccountWithSecret = EmailAccount & { imapPassword: string };

export async function listActiveEmailAccountsWithSecrets(): Promise<EmailAccountWithSecret[]> {
  await schemaReady;
  const { rows } = await pool.query("SELECT * FROM email_accounts WHERE activo = true ORDER BY created_at ASC");
  return rows.map((r) => ({ ...rowToAccount(r), imapPassword: r.imap_password }));
}

export async function createEmailAccount(input: {
  label: string | null;
  email: string;
  imapHost: string;
  imapPort: number;
  imapPassword: string;
}): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    `INSERT INTO email_accounts (label, email, imap_host, imap_port, imap_password)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [input.label, input.email, input.imapHost, input.imapPort, input.imapPassword]
  );
  return rows[0].id as number;
}

export async function deleteEmailAccount(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM email_accounts WHERE id = $1", [id]);
}

export async function setEmailAccountActivo(id: number, activo: boolean): Promise<void> {
  await schemaReady;
  await pool.query("UPDATE email_accounts SET activo = $1 WHERE id = $2", [activo, id]);
}
