import pool, { schemaReady } from "./db";

export type SaneamientoLogEntry = {
  id: number;
  companyId: number;
  empresa: string;
  investigada: boolean;
  valorada: boolean;
  error: string | null;
  createdAt: string;
};

export async function insertSaneamientoLog(entry: {
  companyId: number;
  empresa: string;
  investigada: boolean;
  valorada: boolean;
  error: string | null;
}): Promise<void> {
  await schemaReady;
  await pool.query(
    `INSERT INTO saneamiento_log (company_id, empresa, investigada, valorada, error)
     VALUES ($1, $2, $3, $4, $5)`,
    [entry.companyId, entry.empresa, entry.investigada, entry.valorada, entry.error]
  );
}

// Se listan por fecha desc para que el historial se lea como un registro de
// actividad, y sobrevive a navegar fuera de /saneamiento porque vive en la BD.
export async function listRecentSaneamientoLog(limit: number = 30): Promise<SaneamientoLogEntry[]> {
  await schemaReady;
  const { rows } = await pool.query(
    `SELECT id, company_id, empresa, investigada, valorada, error, created_at
     FROM saneamiento_log ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    companyId: r.company_id,
    empresa: r.empresa,
    investigada: r.investigada,
    valorada: r.valorada,
    error: r.error,
    createdAt: r.created_at,
  }));
}
