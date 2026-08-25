import pool, { schemaReady } from "./db";

export type PipelineEstado = {
  id: number;
  nombre: string;
  orden: number;
  color: string;
  numEmpresas: number;
};

export async function listPipelineEstados(): Promise<PipelineEstado[]> {
  await schemaReady;
  const { rows } = await pool.query(
    `SELECT pe.id, pe.nombre, pe.orden, pe.color, COUNT(c.id) AS num_empresas
     FROM pipeline_estados pe
     LEFT JOIN companies c ON c.estado = pe.nombre
     GROUP BY pe.id, pe.nombre, pe.orden, pe.color
     ORDER BY pe.orden ASC, pe.nombre ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    orden: r.orden,
    color: r.color,
    numEmpresas: Number(r.num_empresas),
  }));
}

export async function listPipelineEstadoNames(): Promise<string[]> {
  await schemaReady;
  const { rows } = await pool.query("SELECT nombre FROM pipeline_estados ORDER BY orden ASC, nombre ASC");
  return rows.map((r) => r.nombre as string);
}

// Powers colored Estado badges/Kanban columns wherever only the estado name
// (not the full PipelineEstado row) is at hand.
export async function listPipelineEstadoColors(): Promise<Record<string, string>> {
  await schemaReady;
  const { rows } = await pool.query("SELECT nombre, color FROM pipeline_estados");
  const map: Record<string, string> = {};
  for (const r of rows as { nombre: string; color: string }[]) map[r.nombre] = r.color;
  return map;
}

export async function createPipelineEstado(nombre: string, orden: number, color: string): Promise<void> {
  await schemaReady;
  await pool.query(
    "INSERT INTO pipeline_estados (nombre, orden, color) VALUES ($1, $2, $3) ON CONFLICT (nombre) DO NOTHING",
    [nombre, orden, color]
  );
}

// Renaming a phase cascades to every company currently on it, so they stay
// visible in the (now renamed) Kanban column instead of becoming orphaned.
export async function updatePipelineEstado(
  id: number,
  input: { nombre: string; orden: number; color: string }
): Promise<void> {
  await schemaReady;
  const { rows } = await pool.query("SELECT nombre FROM pipeline_estados WHERE id = $1", [id]);
  const anterior = rows[0]?.nombre as string | undefined;
  await pool.query("UPDATE pipeline_estados SET nombre = $1, orden = $2, color = $3 WHERE id = $4", [
    input.nombre,
    input.orden,
    input.color,
    id,
  ]);
  if (anterior && anterior !== input.nombre) {
    await pool.query("UPDATE companies SET estado = $1 WHERE estado = $2", [input.nombre, anterior]);
  }
}

// Returns false (and does nothing) if companies still use this phase — they
// must be moved first so nobody silently disappears from the Kanban board.
export async function deletePipelineEstado(id: number): Promise<boolean> {
  await schemaReady;
  const { rows } = await pool.query("SELECT nombre FROM pipeline_estados WHERE id = $1", [id]);
  const nombre = rows[0]?.nombre as string | undefined;
  if (!nombre) return true;
  const { rows: countRows } = await pool.query("SELECT COUNT(*) FROM companies WHERE estado = $1", [nombre]);
  if (Number(countRows[0].count) > 0) return false;
  await pool.query("DELETE FROM pipeline_estados WHERE id = $1", [id]);
  return true;
}
