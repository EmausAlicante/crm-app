import pool, { schemaReady } from "./db";
import type { Contact, ContactInput } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToContact(row: any): Contact {
  return {
    id: row.id,
    companyId: row.company_id,
    nombre: row.nombre,
    cargo: row.cargo,
    email: row.email,
    telefono: row.telefono,
    fotoUrl: row.foto_url,
    esPrincipal: !!row.es_principal,
    notas: row.notas,
    createdAt: row.created_at,
    rolNetel: row.rol_netel,
    linkedinUrl: row.linkedin_url,
  };
}

export async function listContacts(companyId: number): Promise<Contact[]> {
  await schemaReady;
  const { rows } = await pool.query(
    "SELECT * FROM contacts WHERE company_id = $1 ORDER BY es_principal DESC, created_at ASC",
    [companyId]
  );
  return rows.map(rowToContact);
}

export async function createContact(input: ContactInput): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    `INSERT INTO contacts (company_id, nombre, cargo, email, telefono, foto_url, es_principal, notas, rol_netel, linkedin_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      input.companyId,
      input.nombre,
      input.cargo,
      input.email,
      input.telefono,
      input.fotoUrl,
      input.esPrincipal,
      input.notas,
      input.rolNetel ?? null,
      input.linkedinUrl ?? null,
    ]
  );
  return rows[0].id as number;
}

export async function updateContact(id: number, input: Partial<ContactInput>): Promise<void> {
  await schemaReady;
  const cols: string[] = [];
  const values: unknown[] = [];
  const colFor: Record<string, string> = {
    nombre: "nombre",
    cargo: "cargo",
    email: "email",
    telefono: "telefono",
    fotoUrl: "foto_url",
    esPrincipal: "es_principal",
    notas: "notas",
    rolNetel: "rol_netel",
    linkedinUrl: "linkedin_url",
  };
  let i = 1;
  for (const [key, value] of Object.entries(input)) {
    const col = colFor[key];
    if (!col) continue;
    cols.push(`${col} = $${i}`);
    values.push(value ?? null);
    i++;
  }
  if (cols.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE contacts SET ${cols.join(", ")} WHERE id = $${i}`, values);
}

export async function deleteContact(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM contacts WHERE id = $1", [id]);
}
