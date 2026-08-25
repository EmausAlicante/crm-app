import pool, { schemaReady } from "./db";
import type { PipelineAction, PipelineActionInput } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAction(row: any): PipelineAction {
  return {
    id: row.id,
    companyId: row.company_id,
    tipo: row.tipo,
    titulo: row.titulo,
    fechaPrevista: row.fecha_prevista,
    horaPrevista: row.hora_prevista,
    completada: !!row.completada,
    completedAt: row.completed_at,
    notas: row.notas,
    createdAt: row.created_at,
    resultadoLlamada: row.resultado_llamada,
    motivoRechazo: row.motivo_rechazo,
  };
}

export async function listActionsForCompany(companyId: number): Promise<PipelineAction[]> {
  await schemaReady;
  const { rows } = await pool.query(
    "SELECT * FROM pipeline_actions WHERE company_id = $1 ORDER BY completada ASC, fecha_prevista ASC NULLS LAST, created_at ASC",
    [companyId]
  );
  return rows.map(rowToAction);
}

export type UpcomingAction = PipelineAction & { empresa: string };

export async function listUpcomingActions(limit = 20): Promise<UpcomingAction[]> {
  await schemaReady;
  const { rows } = await pool.query(
    `SELECT pa.*, c.empresa as empresa
     FROM pipeline_actions pa
     JOIN companies c ON c.id = pa.company_id
     WHERE pa.completada = false
     ORDER BY (pa.fecha_prevista IS NULL), pa.fecha_prevista ASC, pa.created_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({ ...rowToAction(r), empresa: r.empresa }));
}

// "Right now" in the app's configured timezone, as sortable strings —
// avoids relying on Postgres's session timezone (which may be UTC) for the
// hora_prevista comparison below.
function nowInTimezone(timezone: string): { dateStr: string; timeStr: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { dateStr: `${get("year")}-${get("month")}-${get("day")}`, timeStr: `${get("hour")}:${get("minute")}` };
}

// Powers the due-actions bell/popup: anything overdue from a previous day
// (regardless of hora_prevista), plus anything due today whose hora_prevista
// has already passed (or has none set, so it's due as soon as the date hits).
export async function listDueActionsNow(timezone: string): Promise<UpcomingAction[]> {
  await schemaReady;
  const { dateStr, timeStr } = nowInTimezone(timezone);
  const { rows } = await pool.query(
    `SELECT pa.*, c.empresa as empresa
     FROM pipeline_actions pa
     JOIN companies c ON c.id = pa.company_id
     WHERE pa.completada = false AND pa.fecha_prevista IS NOT NULL AND pa.fecha_prevista <= $1
     ORDER BY pa.fecha_prevista ASC, pa.hora_prevista ASC NULLS FIRST`,
    [dateStr]
  );
  return rows
    .map((r) => ({ ...rowToAction(r), empresa: r.empresa }))
    .filter((a) => {
      if (a.fechaPrevista! < dateStr) return true; // overdue from an earlier day
      return !a.horaPrevista || a.horaPrevista.slice(0, 5) <= timeStr;
    });
}

export async function createAction(input: PipelineActionInput): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    `INSERT INTO pipeline_actions (company_id, tipo, titulo, fecha_prevista, hora_prevista, completada, notas, resultado_llamada, motivo_rechazo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      input.companyId,
      input.tipo,
      input.titulo,
      input.fechaPrevista,
      input.horaPrevista,
      input.completada,
      input.notas,
      input.resultadoLlamada ?? null,
      input.motivoRechazo ?? null,
    ]
  );
  return rows[0].id as number;
}

export async function updateAction(
  id: number,
  input: Partial<
    Pick<
      PipelineActionInput,
      "tipo" | "titulo" | "fechaPrevista" | "horaPrevista" | "notas" | "resultadoLlamada" | "motivoRechazo"
    >
  >
): Promise<void> {
  await schemaReady;
  const colFor: Record<string, string> = {
    tipo: "tipo",
    titulo: "titulo",
    fechaPrevista: "fecha_prevista",
    horaPrevista: "hora_prevista",
    notas: "notas",
    resultadoLlamada: "resultado_llamada",
    motivoRechazo: "motivo_rechazo",
  };
  const cols: string[] = [];
  const values: unknown[] = [];
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
  await pool.query(`UPDATE pipeline_actions SET ${cols.join(", ")} WHERE id = $${i}`, values);
}

export async function setActionCompleted(id: number, completada: boolean): Promise<void> {
  await schemaReady;
  await pool.query(
    "UPDATE pipeline_actions SET completada = $1, completed_at = CASE WHEN $1 THEN now() ELSE NULL END WHERE id = $2",
    [completada, id]
  );
}

export async function deleteAction(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM pipeline_actions WHERE id = $1", [id]);
}

// Powers the header badge shown on every page — actions overdue or due today.
export async function countDueActions(): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS c FROM pipeline_actions WHERE completada = false AND fecha_prevista IS NOT NULL AND fecha_prevista <= CURRENT_DATE"
  );
  return rows[0]?.c ?? 0;
}
