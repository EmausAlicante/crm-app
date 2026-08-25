import pool from "./db";
import { IMPORT_FIELDS, type FieldDiff, type ImportField, type MappedRow } from "./importFields";

export type ExistingCompany = {
  id: number;
  empresa: string;
  nombre_comercial: string | null;
  web: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  municipio: string | null;
  codigo_postal: string | null;
  provincia: string | null;
  contacto: string | null;
  cargo: string | null;
  clasificacion: string | null;
  observaciones: string | null;
  valoracion: string | null;
  estado: string | null;
  fecha_ultima_visita: string | null;
  proxima_visita: string | null;
  competidor_actual: string | null;
  objeciones: string | null;
  producto_recomendado: string | null;
  argumentario: string | null;
  zona_ruta: string | null;
  netel_prioridad: string | null;
  netel_score: string | null;
  netel_estrategia_entrada: string | null;
  netel_argumento: string | null;
  netel_objecion_probable: string | null;
  netel_respuesta_sugerida: string | null;
  netel_pregunta_recepcion: string | null;
  nivel_investigacion: string | null;
  fuente_investigacion: string | null;
  fecha_verificacion_investig: string | null;
};

const DIFF_COL_FOR_FIELD: Partial<Record<ImportField, keyof ExistingCompany>> = {
  nombreComercial: "nombre_comercial",
  direccion: "direccion",
  municipio: "municipio",
  codigoPostal: "codigo_postal",
  provincia: "provincia",
  web: "web",
  email: "email",
  telefono: "telefono",
  contacto: "contacto",
  cargo: "cargo",

  // --- campos 1:1 que ya existían en companies ---
  observaciones: "observaciones",
  valoracion: "valoracion",
  estado: "estado",
  fechaUltimaVisita: "fecha_ultima_visita",
  proximaVisita: "proxima_visita",
  competidorActual: "competidor_actual",
  objeciones: "objeciones",
  productoRecomendado: "producto_recomendado",
  argumentario: "argumentario",
  zonaRuta: "zona_ruta",

  // --- Módulo NETEL ---
  netelPrioridad: "netel_prioridad",
  netelScore: "netel_score",
  netelEstrategiaEntrada: "netel_estrategia_entrada",
  netelArgumento: "netel_argumento",
  netelObjecionProbable: "netel_objecion_probable",
  netelRespuestaSugerida: "netel_respuesta_sugerida",
  netelPreguntaRecepcion: "netel_pregunta_recepcion",
  nivelInvestigacion: "nivel_investigacion",
  fuenteInvestigacion: "fuente_investigacion",
  fechaVerificacionInvestigacion: "fecha_verificacion_investig",

  // Nota: "especializacion", "marcas", "decisorEconomico", "prescriptorTecnico"
  // quedan fuera a propósito — no son columnas 1:1 (ver importParse.ts / contacts).
};

const LEGAL_WORDS = [
  "s.l.u.", "s.l.", "s.a.u.", "s.a.", "sl", "sa", "slu", "sau", "srl",
  "grupo", "espana", "españa", "puertas", "automaticas", "automáticas",
  "automatismos", "sociedad",
];

export function normalizeName(name: string): string {
  let n = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, ""); // strip accents
  n = n.replace(/\([^)]*\)/g, " ");
  for (const w of LEGAL_WORDS) {
    n = n.replace(new RegExp(`\\b${w.replace(/\./g, "\\.")}\\b`, "g"), " ");
  }
  n = n.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return n;
}

export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  let d = url.toLowerCase().trim();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0];
  return d || null;
}

function phoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-9);
}

export type MatchResult = { id: number; name: string; reason: string } | null;

export async function findExistingCompanies(): Promise<ExistingCompany[]> {
  const { rows } = await pool.query(
    `SELECT id, empresa, nombre_comercial, web, email, telefono,
            direccion, municipio, codigo_postal, provincia, contacto, cargo, clasificacion,
            observaciones, valoracion, estado, fecha_ultima_visita, proxima_visita,
            competidor_actual, objeciones, producto_recomendado, argumentario, zona_ruta,
            netel_prioridad, netel_score, netel_estrategia_entrada, netel_argumento,
            netel_objecion_probable, netel_respuesta_sugerida, netel_pregunta_recepcion,
            nivel_investigacion, fuente_investigacion, fecha_verificacion_investig
     FROM companies`
  );
  return rows;
}

// Fields where the row has a value that differs from what's already stored —
// these are the ones a plain "fill empty only" enrich would silently skip.
export function diffForUpdate(row: MappedRow, existing: ExistingCompany): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const { key, label } of IMPORT_FIELDS) {
    const col = DIFF_COL_FOR_FIELD[key];
    if (!col) continue;
    const incoming = row[key];
    if (!incoming) continue;
    const current = existing[col] as string | null;
    if (current && current.trim() !== "" && current.trim() !== incoming.trim()) {
      diffs.push({ field: key, label, current, incoming });
    }
  }
  return diffs;
}

export function matchRow(row: MappedRow, existing: ExistingCompany[]): MatchResult {
  const rowEmpresaNorm = row.empresa ? normalizeName(row.empresa) : "";
  const rowDomain = domainOf(row.web) ?? (row.email ? row.email.split("@")[1]?.toLowerCase() ?? null : null);
  const rowPhone = phoneDigits(row.telefono);

  for (const e of existing) {
    // 1) domain match (web or email)
    const eDomain = domainOf(e.web) ?? (e.email ? e.email.split("@")[1]?.toLowerCase() ?? null : null);
    if (rowDomain && eDomain && rowDomain === eDomain) {
      return { id: e.id, name: e.empresa, reason: "mismo dominio web/email" };
    }
    // 2) phone match
    if (rowPhone && phoneDigits(e.telefono) === rowPhone) {
      return { id: e.id, name: e.empresa, reason: "mismo teléfono" };
    }
    // 3) normalized name match (empresa or nombre_comercial)
    if (rowEmpresaNorm) {
      const eNameNorm = normalizeName(e.empresa);
      const eComNorm = e.nombre_comercial ? normalizeName(e.nombre_comercial) : "";
      if (rowEmpresaNorm === eNameNorm || (eComNorm && rowEmpresaNorm === eComNorm)) {
        return { id: e.id, name: e.empresa, reason: "mismo nombre" };
      }
    }
  }
  return null;
}
