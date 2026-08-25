import pool, { schemaReady } from "./db";
import type { BillingPlan, BillingCharge, BillingFrecuencia, ChargeEstado } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPlan(row: any): BillingPlan {
  return {
    id: row.id,
    companyId: row.company_id,
    concepto: row.concepto,
    importe: Number(row.importe),
    frecuencia: row.frecuencia,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    activo: row.activo,
    createdAt: row.created_at,
    companyName: row.empresa ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCharge(row: any): BillingCharge {
  return {
    id: row.id,
    billingPlanId: row.billing_plan_id,
    companyId: row.company_id,
    fechaPrevista: row.fecha_prevista,
    importe: Number(row.importe),
    concepto: row.concepto,
    estado: row.estado,
    fechaEmision: row.fecha_emision,
    fechaCobro: row.fecha_cobro,
    createdAt: row.created_at,
    companyName: row.empresa ?? null,
  };
}

export async function listBillingPlans(companyId?: number): Promise<BillingPlan[]> {
  await schemaReady;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (companyId) {
    params.push(companyId);
    clauses.push(`bp.company_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT bp.*, c.empresa FROM billing_plans bp JOIN companies c ON c.id = bp.company_id
     ${where} ORDER BY bp.created_at DESC`,
    params
  );
  return rows.map(rowToPlan);
}

export async function createBillingPlan(input: {
  companyId: number;
  concepto: string;
  importe: number;
  frecuencia: BillingFrecuencia;
  fechaInicio: string;
  fechaFin: string | null;
}): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    `INSERT INTO billing_plans (company_id, concepto, importe, frecuencia, fecha_inicio, fecha_fin)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [input.companyId, input.concepto, input.importe, input.frecuencia, input.fechaInicio, input.fechaFin]
  );
  return rows[0].id as number;
}

export async function setBillingPlanActivo(id: number, activo: boolean): Promise<void> {
  await schemaReady;
  await pool.query("UPDATE billing_plans SET activo = $1 WHERE id = $2", [activo, id]);
}

export async function deleteBillingPlan(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM billing_plans WHERE id = $1", [id]);
}

const MONTHS_BY_FRECUENCIA: Record<BillingFrecuencia, number> = {
  Mensual: 1,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
};

// Adds one billing interval to a 'YYYY-MM-DD' string, keeping the day-of-month
// (clamped to the shortest month) without going through JS Date/timezone conversion.
function addInterval(dateStr: string, frecuencia: BillingFrecuencia): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const monthsToAdd = MONTHS_BY_FRECUENCIA[frecuencia];
  const totalMonths = m - 1 + monthsToAdd;
  const newYear = y + Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  const daysInNewMonth = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(d, daysInNewMonth);
  return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
}

// Idempotent: creates any due-but-missing charges for active plans, up to today.
// Safe to call on every page load — relies on the UNIQUE(billing_plan_id, fecha_prevista)
// constraint plus ON CONFLICT DO NOTHING rather than tracking generation state separately.
export async function ensureChargesGenerated(): Promise<void> {
  await schemaReady;
  const { rows: plans } = await pool.query("SELECT * FROM billing_plans WHERE activo = true");
  const today = new Date().toISOString().slice(0, 10);

  for (const plan of plans) {
    let cursor: string = plan.fecha_inicio;
    let guard = 0;
    while (cursor <= today && (!plan.fecha_fin || cursor <= plan.fecha_fin) && guard < 1000) {
      await pool.query(
        `INSERT INTO billing_charges (billing_plan_id, company_id, fecha_prevista, importe, concepto, estado)
         VALUES ($1,$2,$3,$4,$5,'Pendiente')
         ON CONFLICT (billing_plan_id, fecha_prevista) DO NOTHING`,
        [plan.id, plan.company_id, cursor, plan.importe, plan.concepto]
      );
      cursor = addInterval(cursor, plan.frecuencia);
      guard++;
    }
  }
}

export type ChargeFilters = { estado?: ChargeEstado; companyId?: number };

export async function listCharges(filters: ChargeFilters = {}): Promise<BillingCharge[]> {
  await schemaReady;
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.estado) {
    params.push(filters.estado);
    clauses.push(`bc.estado = $${params.length}`);
  }
  if (filters.companyId) {
    params.push(filters.companyId);
    clauses.push(`bc.company_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT bc.*, c.empresa FROM billing_charges bc JOIN companies c ON c.id = bc.company_id
     ${where} ORDER BY bc.fecha_prevista ASC`,
    params
  );
  return rows.map(rowToCharge);
}

export async function setChargeEstado(id: number, estado: ChargeEstado): Promise<void> {
  await schemaReady;
  const extra =
    estado === "Emitida" ? ", fecha_emision = now()::date" : estado === "Cobrada" ? ", fecha_cobro = now()::date" : "";
  await pool.query(`UPDATE billing_charges SET estado = $1 ${extra} WHERE id = $2`, [estado, id]);
}
