import pool, { schemaReady } from "./db";
import { listCompanies } from "./companies";
import { listUpcomingActions } from "./pipeline";
import { anthropicConfigured, getAnthropic, MODEL_FABLE } from "./ai/anthropic";

export type NextActionCandidate = {
  companyId: number;
  companyName: string;
  motivo: string;
  prioridad: number;
};

function daysAgo(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((todayUtc - target) / 86400000);
}

const TERMINAL_ESTADOS = new Set(["Cliente", "Descartado"]);

export async function computeNextActionCandidates(): Promise<NextActionCandidate[]> {
  await schemaReady;
  const candidates: NextActionCandidate[] = [];

  const [upcoming, companies, withActionsRes] = await Promise.all([
    listUpcomingActions(200),
    listCompanies(),
    pool.query("SELECT DISTINCT company_id FROM pipeline_actions"),
  ]);
  const companiesWithActions = new Set(withActionsRes.rows.map((r) => r.company_id as number));

  for (const a of upcoming) {
    if (!a.fechaPrevista) continue;
    const dias = daysAgo(a.fechaPrevista);
    if (dias > 0) {
      candidates.push({
        companyId: a.companyId,
        companyName: a.empresa,
        motivo: `Acción vencida hace ${dias} día(s): "${a.titulo}"`,
        prioridad: 100 + dias,
      });
    } else if (dias === 0) {
      candidates.push({
        companyId: a.companyId,
        companyName: a.empresa,
        motivo: `Acción vence hoy: "${a.titulo}"`,
        prioridad: 99,
      });
    }
  }

  for (const c of companies) {
    if (TERMINAL_ESTADOS.has(c.estado)) continue;

    if (c.proximaVisita) {
      const dias = daysAgo(c.proximaVisita);
      if (dias >= 0) {
        candidates.push({
          companyId: c.id,
          companyName: c.empresa,
          motivo: dias > 0 ? `Visita programada hace ${dias} día(s) sin actualizar` : "Visita programada para hoy",
          prioridad: 90 + dias,
        });
      }
    }

    if ((c.estado === "Pendiente" || c.estado === "Contactado") && !companiesWithActions.has(c.id)) {
      if (c.valoracion !== null && c.valoracion >= 3.5) {
        candidates.push({
          companyId: c.id,
          companyName: c.empresa,
          motivo: `Valoración alta (★ ${c.valoracion.toFixed(1)}) sin ninguna acción de seguimiento todavía`,
          prioridad: 50 + Math.round(c.valoracion * 10),
        });
      }
    }
  }

  candidates.sort((a, b) => b.prioridad - a.prioridad);

  const seen = new Set<number>();
  const deduped: NextActionCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.companyId)) continue;
    seen.add(c.companyId);
    deduped.push(c);
  }
  return deduped.slice(0, 15);
}

export async function getDailyDigest(candidates: NextActionCandidate[]): Promise<string> {
  await schemaReady;
  const today = new Date().toISOString().slice(0, 10);
  // Reused only while today's actual candidate list is unchanged — the moment an
  // action gets completed/added/rescheduled the fingerprint changes and this
  // regenerates, instead of the briefing staying frozen on whatever it said first.
  const fingerprint = candidates.map((c) => `${c.companyId}:${c.motivo}`).join("|");
  const { rows } = await pool.query("SELECT resumen FROM daily_digest WHERE fecha = $1 AND fingerprint = $2", [
    today,
    fingerprint,
  ]);
  if (rows[0]) return rows[0].resumen as string;

  let resumen: string;
  if (candidates.length === 0) {
    resumen = "No hay acciones urgentes pendientes hoy. Buen momento para prospección o seguimiento proactivo.";
  } else if (!anthropicConfigured) {
    resumen = `Tienes ${candidates.length} empresa(s) que requieren atención hoy.`;
  } else {
    try {
      const anthropic = getAnthropic();
      const listText = candidates
        .slice(0, 8)
        .map((c) => `- ${c.companyName}: ${c.motivo}`)
        .join("\n");
      const message = await anthropic.messages.create({
        model: MODEL_FABLE,
        max_tokens: 300,
        system:
          "Eres el asistente comercial de NETEL, distribuidor de MATIC (control de accesos). Con la lista de empresas que requieren atención hoy, escribe un briefing breve (3-4 frases, en español, tono directo) para el comercial, priorizando lo más urgente. No inventes datos que no estén en la lista. Responde en texto plano, sin markdown (sin asteriscos, sin títulos, sin listas).",
        messages: [{ role: "user", content: listText }],
      });
      const textBlock = message.content.find((b) => b.type === "text");
      resumen =
        textBlock && textBlock.type === "text" && textBlock.text.trim()
          ? textBlock.text.trim()
          : `Tienes ${candidates.length} empresa(s) que requieren atención hoy.`;
    } catch {
      resumen = `Tienes ${candidates.length} empresa(s) que requieren atención hoy.`;
    }
  }

  await pool.query(
    "INSERT INTO daily_digest (fecha, fingerprint, resumen) VALUES ($1,$2,$3) ON CONFLICT (fecha, fingerprint) DO NOTHING",
    [today, fingerprint, resumen]
  );
  return resumen;
}
