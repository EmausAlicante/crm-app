// Realistic pace for a field sales day: prep + drive time between stops.
export const VISITAS_POR_DIA = 5;

export const ZONAS = [
  "Zona Oeste",
  "Zona Norte",
  "Zona Sur",
  "Corredor del Henares",
  "Madrid Centro",
  "Otra Provincia",
] as const;
export type Zona = (typeof ZONAS)[number];

export const JORNADAS: { value: string; label: string }[] = [
  { value: "completa", label: "Jornada completa" },
  { value: "solo_manana", label: "Solo mañanas" },
  { value: "solo_tarde", label: "Solo tardes" },
];

export const CLASIFICACIONES = [
  "Fabricante",
  "Instalador",
  "SAT",
  "Distribuidor",
  "Empresa de mantenimiento",
  "Integrador",
  "Seguridad",
  "Facility Services",
] as const;

export const ESPECIALIZACIONES: { key: EspecializacionKey; label: string }[] = [
  { key: "espComunidades", label: "Comunidades" },
  { key: "espIndustrial", label: "Industrial" },
  { key: "espParking", label: "Parking" },
  { key: "espBarreras", label: "Barreras" },
  { key: "espControlAccesos", label: "Control de accesos" },
  { key: "espRfid", label: "RFID" },
  { key: "espLpr", label: "LPR" },
  { key: "espAutomatismos", label: "Automatismos" },
  // --- mercados NETEL añadidos (ver Fase 9/procedimiento NETEL) ---
  { key: "espGarajes", label: "Garajes" },
  { key: "espEmpresas", label: "Empresas" },
  { key: "espAdministradores", label: "Administradores de fincas" },
  { key: "espResidencial", label: "Residencial" },
];
export type EspecializacionKey =
  | "espComunidades"
  | "espIndustrial"
  | "espParking"
  | "espBarreras"
  | "espControlAccesos"
  | "espRfid"
  | "espLpr"
  | "espAutomatismos"
  | "espGarajes"
  | "espEmpresas"
  | "espAdministradores"
  | "espResidencial";

export const MARCAS: { key: MarcaKey; label: string }[] = [
  { key: "marcaNice", label: "Nice" },
  { key: "marcaFaac", label: "FAAC" },
  { key: "marcaBft", label: "BFT" },
  { key: "marcaCame", label: "CAME" },
  { key: "marcaHormann", label: "Hörmann" },
  { key: "marcaMotorline", label: "Motorline" },
  { key: "marcaErreka", label: "Erreka" },
  { key: "marcaGibidi", label: "Gibidi" },
  { key: "marcaBeninca", label: "Beninca" },
  { key: "marcaRoger", label: "Roger" },
  { key: "marcaDea", label: "DEA" },
  { key: "marcaOtras", label: "Otras" },
];
export type MarcaKey =
  | "marcaNice"
  | "marcaFaac"
  | "marcaBft"
  | "marcaCame"
  | "marcaHormann"
  | "marcaMotorline"
  | "marcaErreka"
  | "marcaGibidi"
  | "marcaBeninca"
  | "marcaRoger"
  | "marcaDea"
  | "marcaOtras";

export const SCORE_FIELDS: { key: ScoreKey; label: string; max: number }[] = [
  { key: "scoreMantenimiento", label: "Mantenimiento de puertas", max: 20 },
  { key: "scoreComunidades", label: "Trabajo con comunidades", max: 15 },
  { key: "scoreControlAccesos", label: "Control de accesos", max: 15 },
  { key: "scoreSatPropio", label: "SAT propio", max: 15 },
  { key: "scoreTamano", label: "Tamaño de empresa", max: 15 },
  { key: "scoreDelegaciones", label: "Delegaciones", max: 10 },
  { key: "scoreMarcas", label: "Marcas distribuidas", max: 10 },
];
export type ScoreKey =
  | "scoreMantenimiento"
  | "scoreComunidades"
  | "scoreControlAccesos"
  | "scoreSatPropio"
  | "scoreTamano"
  | "scoreDelegaciones"
  | "scoreMarcas";

// Optional supporting breakdown (0-100), shown alongside the primary 0-5 `valoracion`
// but no longer required to fill in before a company can have a rating.
export function computeScoreTotal(scores: Partial<Record<ScoreKey, number | null>>): number | null {
  const filled = SCORE_FIELDS.map((f) => scores[f.key]).filter((v) => v !== null && v !== undefined) as number[];
  if (filled.length === 0) return null;
  return filled.reduce((a, b) => a + b, 0);
}

// Display text for the primary 0-5 star rating (e.g. "★ 4.2"). Empty string when unrated.
export function starRating(valoracion: number | null): string {
  if (valoracion === null) return "";
  return `★ ${valoracion.toFixed(1)}`;
}

// Qualitative bucket label, used to group/count companies (e.g. dashboard histogram).
export function ratingBucketLabel(valoracion: number | null): string {
  if (valoracion === null) return "Sin evaluar";
  if (valoracion >= 4.5) return "★★★★★ Estratégico";
  if (valoracion >= 3.5) return "★★★★ Muy interesante";
  if (valoracion >= 2.5) return "★★★ Medio";
  if (valoracion >= 1.5) return "★★ Bajo";
  return "★ Muy bajo";
}

// Tailwind classes for the colored rating badge, by bucket.
export function ratingStyle(valoracion: number | null): string {
  if (valoracion === null) return "bg-slate-100 text-slate-500";
  if (valoracion >= 4.5) return "bg-emerald-100 text-emerald-800";
  if (valoracion >= 3.5) return "bg-green-100 text-green-700";
  if (valoracion >= 2.5) return "bg-amber-100 text-amber-700";
  if (valoracion >= 1.5) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export const RATING_BUCKET_STYLES: Record<string, string> = {
  "★★★★★ Estratégico": "bg-emerald-100 text-emerald-800",
  "★★★★ Muy interesante": "bg-green-100 text-green-700",
  "★★★ Medio": "bg-amber-100 text-amber-700",
  "★★ Bajo": "bg-orange-100 text-orange-700",
  "★ Muy bajo": "bg-red-100 text-red-700",
  "Sin evaluar": "bg-slate-100 text-slate-500",
};

// ============================================================
// Módulo NETEL — prospección comercial de distribuidores
// (ver informe-crm-app.md / propuesta-modulo-netel.md)
// ============================================================

export const NETEL_PRIORIDADES = ["A+", "A", "B", "C"] as const;
export type NetelPrioridad = (typeof NETEL_PRIORIDADES)[number];

export const NETEL_PRIORIDAD_STYLES: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-800",
  A: "bg-green-100 text-green-700",
  B: "bg-amber-100 text-amber-700",
  C: "bg-slate-100 text-slate-500",
};

export const NETEL_ESTRATEGIAS: { key: string; label: string; mensaje: string }[] = [
  { key: "cartera_instalada", label: "Cartera instalada", mensaje: "Obtén más rentabilidad de las puertas que ya tienes instaladas." },
  { key: "recurrencia", label: "Recurrencia", mensaje: "Añade un nuevo servicio recurrente a tus clientes actuales." },
  { key: "control_accesos", label: "Control de accesos", mensaje: "Añade una alternativa móvil sencilla e independiente del automatismo." },
  { key: "fabricante", label: "Fabricante", mensaje: "Entrega tus puertas con gestión móvil sin desarrollar hardware/software propio." },
  { key: "distribucion", label: "Distribución", mensaje: "Incorpora una solución adicional para tu red de instaladores." },
  { key: "partnership", label: "Partnership", mensaje: "Integración/OEM/colaboración tecnológica, no venta unitaria." },
  { key: "comunidades_facility", label: "Comunidades / Facility", mensaje: "Digitaliza la gestión de accesos de comunidades y edificios." },
];

export const NIVELES_INVESTIGACION = ["Baja", "Media", "Media-Alta", "Alta"] as const;

export const ROLES_NETEL = [
  { key: "decisor_economico", label: "Decisor económico" },
  { key: "prescriptor_tecnico", label: "Prescriptor técnico" },
] as const;

export const RESULTADOS_LLAMADA = [
  "No contesta",
  "Recepción",
  "Decisor localizado",
  "Hablo con decisor",
  "Enviar información",
  "Interesado",
  "Reunión",
  "No interesado",
  "Ya tiene solución",
  "Llamar posteriormente",
  "No encaja",
] as const;

export const MOTIVOS_RECHAZO = [
  "Ya tiene proveedor",
  "No existe demanda",
  "Precio",
  "Cuota",
  "Tecnología",
  "No quiere plataforma",
  "No trabaja control de accesos",
  "No trabaja comunidades",
  "Tamaño insuficiente",
  "Competencia",
  "Momento inadecuado",
  "Otro",
] as const;

// Pesos del Score NETEL (Fase 8/17 del procedimiento). Punto de partida —
// se ajustarán con datos reales de conversión una vez haya suficiente
// histórico en pipeline_actions.resultado_llamada.
export const NETEL_SCORE_PESOS = {
  mantenimiento: 20, // score_mantenimiento > 60
  instalador: 15, // clasificacion incluye "Instalador"
  comunidades: 15, // espComunidades
  controlAccesos: 15, // espControlAccesos
  fabricante: 12, // clasificacion incluye "Fabricante"
  distribuidor: 12, // clasificacion incluye "Distribuidor"
  sat: 10, // clasificacion incluye "SAT"
  multimarca: 10, // más de una marca marcada
  barrerasParking: 8, // espBarreras o espParking
  lpr: 5, // espLpr
};

// Calcula un Score NETEL (0-100 aprox.) a partir de los campos ya existentes
// en companies — no inventa datos nuevos, combina lo que ya se rellena en
// la ficha de empresa (clasificacion, esp_*, marca_*, sub-scores 0-100).
export function calculateNetelScore(company: {
  clasificacion: string | null;
  espComunidades: boolean;
  espControlAccesos: boolean;
  espBarreras: boolean;
  espParking: boolean;
  espLpr: boolean;
  scoreMantenimiento: number | null;
}, marcasActivas: number): number {
  const tags = (company.clasificacion || "").toLowerCase();
  let score = 0;
  if ((company.scoreMantenimiento ?? 0) > 60) score += NETEL_SCORE_PESOS.mantenimiento;
  if (tags.includes("instalador")) score += NETEL_SCORE_PESOS.instalador;
  if (company.espComunidades) score += NETEL_SCORE_PESOS.comunidades;
  if (company.espControlAccesos) score += NETEL_SCORE_PESOS.controlAccesos;
  if (tags.includes("fabricante")) score += NETEL_SCORE_PESOS.fabricante;
  if (tags.includes("distribuidor")) score += NETEL_SCORE_PESOS.distribuidor;
  if (tags.includes("sat")) score += NETEL_SCORE_PESOS.sat;
  if (marcasActivas > 1) score += NETEL_SCORE_PESOS.multimarca;
  if (company.espBarreras || company.espParking) score += NETEL_SCORE_PESOS.barrerasParking;
  if (company.espLpr) score += NETEL_SCORE_PESOS.lpr;
  return score;
}

// Del Score NETEL a la prioridad A+/A/B/C (Fase 9). Umbrales de partida,
// ajustables junto con NETEL_SCORE_PESOS.
export function netelPrioridadFromScore(score: number): NetelPrioridad {
  if (score >= 80) return "A+";
  if (score >= 55) return "A";
  if (score >= 30) return "B";
  return "C";
}
