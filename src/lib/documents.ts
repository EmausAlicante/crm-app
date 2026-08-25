import pool, { schemaReady } from "./db";
import type { CrmDocument, DocumentCategoria } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDocument(row: any): CrmDocument {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    url: row.url,
    nombreArchivo: row.nombre_archivo,
    tamanoBytes: row.tamano_bytes,
    createdAt: row.created_at,
  };
}

export async function listDocuments(categoria?: DocumentCategoria): Promise<CrmDocument[]> {
  await schemaReady;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (categoria) {
    params.push(categoria);
    clauses.push(`categoria = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(`SELECT * FROM documents ${where} ORDER BY created_at DESC`, params);
  return rows.map(rowToDocument);
}

export async function createDocument(input: {
  nombre: string;
  categoria: DocumentCategoria;
  url: string;
  nombreArchivo: string | null;
  tamanoBytes: number | null;
}): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    `INSERT INTO documents (nombre, categoria, url, nombre_archivo, tamano_bytes)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [input.nombre, input.categoria, input.url, input.nombreArchivo, input.tamanoBytes]
  );
  return rows[0].id as number;
}

export async function getDocument(id: number): Promise<CrmDocument | null> {
  await schemaReady;
  const { rows } = await pool.query("SELECT * FROM documents WHERE id = $1", [id]);
  return rows[0] ? rowToDocument(rows[0]) : null;
}

export async function deleteDocument(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM documents WHERE id = $1", [id]);
}
