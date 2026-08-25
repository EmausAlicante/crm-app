import pool, { schemaReady } from "./db";

export type CompanyNote = {
  id: number;
  companyId: number;
  texto: string;
  createdAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToNote(row: any): CompanyNote {
  return {
    id: row.id,
    companyId: row.company_id,
    texto: row.texto,
    createdAt: row.created_at,
  };
}

export async function listNotes(companyId: number): Promise<CompanyNote[]> {
  await schemaReady;
  const { rows } = await pool.query(
    "SELECT * FROM company_notes WHERE company_id = $1 ORDER BY created_at DESC",
    [companyId]
  );
  return rows.map(rowToNote);
}

export async function createNote(companyId: number, texto: string): Promise<void> {
  await schemaReady;
  await pool.query("INSERT INTO company_notes (company_id, texto) VALUES ($1, $2)", [companyId, texto]);
}

export async function updateNote(id: number, texto: string): Promise<void> {
  await schemaReady;
  await pool.query("UPDATE company_notes SET texto = $1 WHERE id = $2", [texto, id]);
}

export async function deleteNote(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM company_notes WHERE id = $1", [id]);
}
