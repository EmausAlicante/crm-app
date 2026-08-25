import pool, { schemaReady } from "./db";

export type RutaDia = {
  id: number;
  dia: string;
  zona: string | null;
  notas: string | null;
  orden: number;
};

export async function listRutaDias(): Promise<RutaDia[]> {
  await schemaReady;
  const { rows } = await pool.query("SELECT * FROM ruta_dias ORDER BY orden ASC, dia ASC");
  return rows;
}

export async function createRutaDia(input: {
  dia: string;
  zona: string | null;
  notas: string | null;
  orden: number;
}): Promise<void> {
  await schemaReady;
  await pool.query(
    "INSERT INTO ruta_dias (dia, zona, notas, orden) VALUES ($1,$2,$3,$4) ON CONFLICT (dia) DO NOTHING",
    [input.dia, input.zona, input.notas, input.orden]
  );
}

export async function updateRutaDia(
  id: number,
  input: { dia: string; zona: string | null; notas: string | null; orden: number }
): Promise<void> {
  await schemaReady;
  await pool.query("UPDATE ruta_dias SET dia = $1, zona = $2, notas = $3, orden = $4 WHERE id = $5", [
    input.dia,
    input.zona,
    input.notas,
    input.orden,
    id,
  ]);
}

export async function deleteRutaDia(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM ruta_dias WHERE id = $1", [id]);
}
