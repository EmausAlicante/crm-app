import pool, { schemaReady } from "./db";
import type { Company, CompanyInput } from "./types";
import { ESPECIALIZACIONES, MARCAS } from "./constants";
import { listPipelineEstadoNames } from "./pipelineEstados";

const ESP_COLS: Record<string, string> = {
  espComunidades: "esp_comunidades",
  espIndustrial: "esp_industrial",
  espParking: "esp_parking",
  espBarreras: "esp_barreras",
  espControlAccesos: "esp_control_accesos",
  espRfid: "esp_rfid",
  espLpr: "esp_lpr",
  espAutomatismos: "esp_automatismos",
  // --- mercados NETEL ---
  espGarajes: "esp_garajes",
  espEmpresas: "esp_empresas",
  espAdministradores: "esp_administradores",
  espResidencial: "esp_residencial",
};
const MARCA_COLS: Record<string, string> = {
  marcaNice: "marca_nice",
  marcaFaac: "marca_faac",
  marcaBft: "marca_bft",
  marcaCame: "marca_came",
  marcaHormann: "marca_hormann",
  marcaMotorline: "marca_motorline",
  marcaErreka: "marca_erreka",
  marcaGibidi: "marca_gibidi",
  marcaBeninca: "marca_beninca",
  marcaRoger: "marca_roger",
  marcaDea: "marca_dea",
  marcaOtras: "marca_otras",
};
const SCORE_COLS: Record<string, string> = {
  scoreMantenimiento: "score_mantenimiento",
  scoreComunidades: "score_comunidades",
  scoreControlAccesos: "score_control_accesos",
  scoreSatPropio: "score_sat_propio",
  scoreTamano: "score_tamano",
  scoreDelegaciones: "score_delegaciones",
  scoreMarcas: "score_marcas",
};
// Numeric columns pg returns as strings and that need Number() coercion, like SCORE_COLS.
const NUMERIC_COLS: Record<string, string> = {
  valoracion: "valoracion",
};

// --- Módulo NETEL ---
// netelScore es numérico y necesita la misma coerción que NUMERIC_COLS/SCORE_COLS.
const NETEL_NUMERIC_COLS: Record<string, string> = {
  netelScore: "netel_score",
};
const NETEL_TEXT_COLS: Record<string, string> = {
  netelPrioridad: "netel_prioridad",
  netelEstrategiaEntrada: "netel_estrategia_entrada",
  netelArgumento: "netel_argumento",
  netelObjecionProbable: "netel_objecion_probable",
  netelRespuestaSugerida: "netel_respuesta_sugerida",
  netelPreguntaRecepcion: "netel_pregunta_recepcion",
  nivelInvestigacion: "nivel_investigacion",
  fuenteInvestigacion: "fuente_investigacion",
  fechaVerificacionInvestigacion: "fecha_verificacion_investig",
};

const SIMPLE_COLS: Record<string, string> = {
  empresa: "empresa",
  nombreComercial: "nombre_comercial",
  direccion: "direccion",
  municipio: "municipio",
  codigoPostal: "codigo_postal",
  provincia: "provincia",
  latitud: "latitud",
  longitud: "longitud",
  web: "web",
  email: "email",
  telefono: "telefono",
  whatsapp: "whatsapp",
  contacto: "contacto",
  cargo: "cargo",
  logoUrl: "logo_url",
  clasificacion: "clasificacion",
  estado: "estado",
  fechaUltimaVisita: "fecha_ultima_visita",
  proximaVisita: "proxima_visita",
  proximaVisitaHora: "proxima_visita_hora",
  competidorActual: "competidor_actual",
  objeciones: "objeciones",
  observaciones: "observaciones",
  productoRecomendado: "producto_recomendado",
  argumentario: "argumentario",
  zonaRuta: "zona_ruta",
  jornada: "jornada",

  cif: "cif",
  razonSocialFiscal: "razon_social_fiscal",
  iban: "iban",
  banco: "banco",
  titularCuenta: "titular_cuenta",
  formaPago: "forma_pago",
  plazoPago: "plazo_pago",
  limiteCredito: "limite_credito",
  documentoBancarioUrl: "documento_bancario_url",
  lopdFirmado: "lopd_firmado",
  lopdFechaFirma: "lopd_fecha_firma",
  lopdDocumentoUrl: "lopd_documento_url",

  scoreEstimadoIa: "score_estimado_ia",
};

const ALL_COLS: Record<string, string> = {
  ...SIMPLE_COLS,
  ...ESP_COLS,
  ...MARCA_COLS,
  ...SCORE_COLS,
  ...NUMERIC_COLS,
  ...NETEL_TEXT_COLS,
  ...NETEL_NUMERIC_COLS,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCompany(row: any): Company {
  const out: Record<string, unknown> = {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  for (const [camel, snake] of Object.entries(SIMPLE_COLS)) out[camel] = row[snake];
  for (const [camel, snake] of Object.entries(ESP_COLS)) out[camel] = !!row[snake];
  for (const [camel, snake] of Object.entries(MARCA_COLS)) out[camel] = !!row[snake];
  for (const [camel, snake] of Object.entries(SCORE_COLS)) out[camel] = row[snake] === null ? null : Number(row[snake]);
  for (const [camel, snake] of Object.entries(NUMERIC_COLS)) out[camel] = row[snake] === null ? null : Number(row[snake]);
  for (const [camel, snake] of Object.entries(NETEL_TEXT_COLS)) out[camel] = row[snake];
  for (const [camel, snake] of Object.entries(NETEL_NUMERIC_COLS)) out[camel] = row[snake] === null ? null : Number(row[snake]);
  return out as unknown as Company;
}

export type CompanyFilters = {
  search?: string;
  estado?: string;
  zonaRuta?: string;
  clasificacion?: string;
  provincia?: string;
  municipio?: string;
};

export async function listCompanies(filters: CompanyFilters = {}): Promise<Company[]> {
  await schemaReady;
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(
      `(empresa ILIKE $${params.length} OR municipio ILIKE $${params.length} OR email ILIKE $${params.length} OR contacto ILIKE $${params.length})`
    );
  }
  if (filters.estado) {
    params.push(filters.estado);
    clauses.push(`estado = $${params.length}`);
  }
  if (filters.zonaRuta) {
    params.push(filters.zonaRuta);
    clauses.push(`zona_ruta = $${params.length}`);
  }
  if (filters.clasificacion) {
    params.push(`%${filters.clasificacion}%`);
    clauses.push(`clasificacion ILIKE $${params.length}`);
  }
  if (filters.provincia) {
    params.push(filters.provincia);
    clauses.push(`provincia = $${params.length}`);
  }
  if (filters.municipio) {
    params.push(filters.municipio);
    clauses.push(`municipio = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(`SELECT * FROM companies ${where} ORDER BY empresa ASC`, params);
  return rows.map(rowToCompany);
}

// Fase 1 del plan de agentes proactivos: leads que se colaron sin datos clave
// (nunca se investigaron a fondo) o sin valoración todavía. Es la cola que
// alimenta la pantalla de Saneamiento.
export type IncompleteCompany = {
  id: number;
  empresa: string;
  faltaWeb: boolean;
  faltaTelefono: boolean;
  faltaDireccion: boolean;
  faltaValoracion: boolean;
};

export async function countIncompleteCompanies(): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM companies
     WHERE web IS NULL OR web = '' OR telefono IS NULL OR telefono = ''
        OR direccion IS NULL OR direccion = '' OR valoracion IS NULL`
  );
  return rows[0]?.c ?? 0;
}

export async function listIncompleteCompanies(limit: number): Promise<IncompleteCompany[]> {
  await schemaReady;
  const { rows } = await pool.query(
    `SELECT id, empresa, web, telefono, direccion, valoracion FROM companies
     WHERE web IS NULL OR web = '' OR telefono IS NULL OR telefono = ''
        OR direccion IS NULL OR direccion = '' OR valoracion IS NULL
     ORDER BY updated_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    empresa: r.empresa,
    faltaWeb: !r.web,
    faltaTelefono: !r.telefono,
    faltaDireccion: !r.direccion,
    faltaValoracion: r.valoracion === null,
  }));
}

export async function listDistinctProvincias(): Promise<string[]> {
  await schemaReady;
  const { rows } = await pool.query(
    "SELECT DISTINCT provincia FROM companies WHERE provincia IS NOT NULL AND provincia <> '' ORDER BY provincia"
  );
  return rows.map((r) => r.provincia as string);
}

export async function listDistinctMunicipios(provincia?: string): Promise<string[]> {
  await schemaReady;
  const clauses = ["municipio IS NOT NULL", "municipio <> ''"];
  const params: unknown[] = [];
  if (provincia) {
    params.push(provincia);
    clauses.push(`provincia = $${params.length}`);
  }
  const { rows } = await pool.query(
    `SELECT DISTINCT municipio FROM companies WHERE ${clauses.join(" AND ")} ORDER BY municipio`,
    params
  );
  return rows.map((r) => r.municipio as string);
}

export async function getCompany(id: number): Promise<Company | null> {
  await schemaReady;
  const { rows } = await pool.query("SELECT * FROM companies WHERE id = $1", [id]);
  return rows[0] ? rowToCompany(rows[0]) : null;
}

function buildAssignments(input: Partial<CompanyInput>, startIndex: number) {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = startIndex;
  for (const [camel, value] of Object.entries(input)) {
    const col = ALL_COLS[camel];
    if (!col) continue;
    cols.push(col);
    placeholders.push(`$${i}`);
    values.push(typeof value === "boolean" ? value : value ?? null);
    i++;
  }
  return { cols, placeholders, values };
}

export async function createCompany(input: CompanyInput): Promise<number> {
  await schemaReady;
  const { cols, placeholders, values } = buildAssignments(input, 1);
  const sql = `INSERT INTO companies (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id`;
  const { rows } = await pool.query(sql, values);
  return rows[0].id as number;
}

export async function updateCompany(id: number, input: Partial<CompanyInput>): Promise<void> {
  await schemaReady;
  const { cols, values } = buildAssignments(input, 1);
  if (cols.length === 0) return;
  const setParts = cols.map((c, idx) => `${c} = $${idx + 1}`);
  const idParam = values.length + 1;
  const sql = `UPDATE companies SET ${setParts.join(", ")}, updated_at = now() WHERE id = $${idParam}`;
  await pool.query(sql, [...values, id]);
}

// Adds new tags to clasificacion without duplicating or dropping existing ones.
export async function mergeClasificacionTags(id: number, tags: string[]): Promise<void> {
  if (tags.length === 0) return;
  await schemaReady;
  const { rows } = await pool.query("SELECT clasificacion FROM companies WHERE id = $1", [id]);
  if (!rows[0]) return;
  const existing: string[] = (rows[0].clasificacion || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  for (const tag of tags) {
    const t = tag.trim();
    if (t && !existing.includes(t)) existing.push(t);
  }
  await pool.query("UPDATE companies SET clasificacion = $1, updated_at = now() WHERE id = $2", [
    existing.join(", "),
    id,
  ]);
}

// Used by the spreadsheet importer to enrich an existing company without ever
// clobbering data the user already entered: simple fields are only filled when
// currently empty, clasificacion tags are merged (deduped), observaciones are appended.
export async function enrichCompanyFromImport(
  id: number,
  patch: Partial<{
    nombreComercial: string;
    direccion: string;
    municipio: string;
    codigoPostal: string;
    provincia: string;
    web: string;
    email: string;
    telefono: string;
    contacto: string;
    cargo: string;
    zonaRuta: string;
    clasificacion: string;
    observaciones: string;
    // --- Módulo NETEL ---
    netelPrioridad: string;
    netelEstrategiaEntrada: string;
    netelArgumento: string;
    netelObjecionProbable: string;
    netelRespuestaSugerida: string;
    netelPreguntaRecepcion: string;
    nivelInvestigacion: string;
    fuenteInvestigacion: string;
    fechaVerificacionInvestigacion: string;
  }>,
  // field keys (matching `patch`) that should be written even when the current
  // value is non-empty — i.e. fields the user explicitly approved to overwrite.
  forceOverwrite: string[] = []
): Promise<void> {
  await schemaReady;
  const { rows } = await pool.query("SELECT * FROM companies WHERE id = $1", [id]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = rows[0] as any;
  if (!current) return;

  const fillOnlyIfEmpty = [
    "nombreComercial", "direccion", "municipio", "codigoPostal", "provincia",
    "web", "email", "telefono", "contacto", "cargo", "zonaRuta",
    // --- Módulo NETEL: se rellenan solo si están vacíos, igual que el resto ---
    "netelPrioridad", "netelEstrategiaEntrada", "netelArgumento", "netelObjecionProbable",
    "netelRespuestaSugerida", "netelPreguntaRecepcion", "nivelInvestigacion",
    "fuenteInvestigacion", "fechaVerificacionInvestigacion",
  ] as const;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  for (const key of fillOnlyIfEmpty) {
    const val = patch[key];
    if (!val) continue;
    const col = ALL_COLS[key];
    const isEmpty = current[col] === null || current[col] === "";
    if (isEmpty || forceOverwrite.includes(key)) {
      sets.push(`${col} = $${i}`);
      values.push(val);
      i++;
    }
  }

  if (patch.clasificacion) {
    const existingTags = (current.clasificacion || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    for (const tag of patch.clasificacion.split(",").map((s) => s.trim())) {
      if (tag && !existingTags.includes(tag)) existingTags.push(tag);
    }
    if (existingTags.join(", ") !== (current.clasificacion || "")) {
      sets.push(`clasificacion = $${i}`);
      values.push(existingTags.join(", "));
      i++;
    }
  }

  if (patch.observaciones) {
    const merged = current.observaciones ? `${current.observaciones} | ${patch.observaciones}` : patch.observaciones;
    sets.push(`observaciones = $${i}`);
    values.push(merged);
    i++;
  }

  if (sets.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE companies SET ${sets.join(", ")}, updated_at = now() WHERE id = $${i}`, values);
}

export async function deleteCompany(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM companies WHERE id = $1", [id]);
}

// Completing a pipeline action means you've made contact — if the company is
// still sitting on the first Kanban phase, move it to the second one
// automatically instead of making the user drag the card by hand. Only
// advances from the very first phase, so it never overrides a further-along
// stage the user set deliberately.
export async function advanceEstadoOnContact(companyId: number): Promise<void> {
  await schemaReady;
  const estados = await listPipelineEstadoNames();
  if (estados.length < 2) return;
  const { rows } = await pool.query("SELECT estado FROM companies WHERE id = $1", [companyId]);
  if (rows[0]?.estado !== estados[0]) return;
  await pool.query("UPDATE companies SET estado = $1, updated_at = now() WHERE id = $2", [estados[1], companyId]);
}

export type DashboardStats = {
  total: number;
  porEstado: Record<string, number>;
  distribuidoresPotenciales: number;
  porZona: Record<string, number>;
  porEspecializacion: { label: string; count: number }[];
  porMarca: { label: string; count: number }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await schemaReady;
  const totalRes = await pool.query("SELECT COUNT(*)::int as c FROM companies");
  const total = totalRes.rows[0].c as number;

  const estadoRes = await pool.query("SELECT estado, COUNT(*)::int as c FROM companies GROUP BY estado");
  const porEstado: Record<string, number> = {};
  for (const r of estadoRes.rows as { estado: string; c: number }[]) porEstado[r.estado] = r.c;

  const distribRes = await pool.query("SELECT COUNT(*)::int as c FROM companies WHERE clasificacion ILIKE '%Distribuidor%'");
  const distribuidoresPotenciales = distribRes.rows[0].c as number;

  const zonaRes = await pool.query(
    "SELECT zona_ruta as zona, COUNT(*)::int as c FROM companies WHERE zona_ruta IS NOT NULL GROUP BY zona_ruta"
  );
  const porZona: Record<string, number> = {};
  for (const r of zonaRes.rows as { zona: string; c: number }[]) porZona[r.zona] = r.c;

  // One aggregate query per group instead of one COUNT query per column —
  // 20 round-trips collapsed into 2 (columns come from a fixed internal map,
  // never user input, so interpolating them into the SELECT list is safe).
  const espSelect = ESPECIALIZACIONES.map(({ key }) => `SUM(CASE WHEN ${ESP_COLS[key]} THEN 1 ELSE 0 END)::int AS ${ESP_COLS[key]}`).join(", ");
  const espRes = await pool.query(`SELECT ${espSelect} FROM companies`);
  const espRow = espRes.rows[0] as Record<string, number>;
  const porEspecializacion = ESPECIALIZACIONES.map(({ key, label }) => ({ label, count: espRow[ESP_COLS[key]] ?? 0 }));

  const marcaSelect = MARCAS.map(({ key }) => `SUM(CASE WHEN ${MARCA_COLS[key]} THEN 1 ELSE 0 END)::int AS ${MARCA_COLS[key]}`).join(", ");
  const marcaRes = await pool.query(`SELECT ${marcaSelect} FROM companies`);
  const marcaRow = marcaRes.rows[0] as Record<string, number>;
  const porMarcaAll = MARCAS.map(({ key, label }) => ({ label, count: marcaRow[MARCA_COLS[key]] ?? 0 }));
  const porMarca = porMarcaAll.filter((m) => m.count > 0);

  return { total, porEstado, distribuidoresPotenciales, porZona, porEspecializacion, porMarca };
}
