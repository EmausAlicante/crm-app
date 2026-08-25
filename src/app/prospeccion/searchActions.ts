"use server";

import { revalidatePath } from "next/cache";
import { createCompany } from "@/lib/companies";
import { findExistingCompanies, matchRow } from "@/lib/importMatch";
import { inferZona } from "@/lib/zoneMap";
import { checkRateLimit } from "@/lib/rateLimit";
import { searchLeads, type LeadCandidate } from "@/lib/ai/leadSearch";

// Each search runs a web-search-enabled Claude call — a cheap floor stops an
// accidental double-submit/retry-loop from firing it repeatedly.
export async function searchLeadsAction(terms: string[], ubicacion: string, maxResultados: number): Promise<LeadCandidate[]> {
  if (terms.length === 0 || !ubicacion.trim()) return [];
  const allowed = await checkRateLimit("search-leads", 10);
  if (!allowed) throw new Error("Espera unos segundos antes de lanzar otra búsqueda.");
  return searchLeads(terms, ubicacion.trim(), Math.max(1, Math.min(maxResultados, 30)));
}

export type ImportLeadsResult = { created: number; skipped: number; skippedNames: string[] };

// Mirrors the "new company" branch of the CSV importer (importActions.ts) so a
// prospected lead ends up with the exact same shape as a manually imported one.
export async function importLeadsAction(candidates: LeadCandidate[]): Promise<ImportLeadsResult> {
  const existing = await findExistingCompanies();
  let created = 0;
  const skippedNames: string[] = [];

  for (const c of candidates) {
    const match = matchRow(
      { empresa: c.empresa, web: c.web ?? undefined, telefono: c.telefono ?? undefined, email: c.email ?? undefined },
      existing
    );
    if (match) {
      skippedNames.push(`${c.empresa} (ya existe: ${match.name})`);
      continue;
    }

    const zonaRuta = inferZona(c.municipio, c.provincia);
    await createCompany({
      empresa: c.empresa,
      nombreComercial: null,
      direccion: c.direccion,
      municipio: c.municipio,
      codigoPostal: c.codigoPostal,
      provincia: c.provincia ?? null,
      latitud: null,
      longitud: null,
      web: c.web,
      email: c.email,
      telefono: c.telefono,
      whatsapp: null,
      contacto: null,
      cargo: null,
      logoUrl: null,
      clasificacion: c.clasificacion,
      espComunidades: false,
      espIndustrial: false,
      espParking: false,
      espBarreras: false,
      espControlAccesos: false,
      espRfid: false,
      espLpr: false,
      espAutomatismos: false,
      espGarajes: false,
      espEmpresas: false,
      espAdministradores: false,
      espResidencial: false,
      marcaNice: false,
      marcaFaac: false,
      marcaBft: false,
      marcaCame: false,
      marcaHormann: false,
      marcaMotorline: false,
      marcaErreka: false,
      marcaGibidi: false,
      marcaBeninca: false,
      marcaRoger: false,
      marcaDea: false,
      marcaOtras: false,
      scoreMantenimiento: null,
      scoreComunidades: null,
      scoreControlAccesos: null,
      scoreSatPropio: null,
      scoreTamano: null,
      scoreDelegaciones: null,
      scoreMarcas: null,
      estado: "Pendiente",
      fechaUltimaVisita: null,
      proximaVisita: null,
      proximaVisitaHora: null,
      competidorActual: null,
      objeciones: null,
      observaciones: `Lead encontrado por prospección con IA (${new Date().toLocaleDateString("es-ES")}): ${c.justificacion}`,
      productoRecomendado: null,
      argumentario: null,
      zonaRuta,
      jornada: null,
      cif: null,
      razonSocialFiscal: null,
      iban: null,
      banco: null,
      titularCuenta: null,
      formaPago: null,
      plazoPago: null,
      limiteCredito: null,
      documentoBancarioUrl: null,
      lopdFirmado: false,
      lopdFechaFirma: null,
      lopdDocumentoUrl: null,
      valoracion: null,
      scoreEstimadoIa: false,
      // --- Módulo NETEL: sin datos todavía, se calculará al investigar la empresa ---
      netelScore: null,
      netelPrioridad: null,
      netelEstrategiaEntrada: null,
      netelArgumento: null,
      netelObjecionProbable: null,
      netelRespuestaSugerida: null,
      netelPreguntaRecepcion: null,
      nivelInvestigacion: null,
      fuenteInvestigacion: null,
      fechaVerificacionInvestigacion: null,
    });
    created++;
    // Keep the in-memory dedupe list current in case two candidates in this
    // same batch are actually the same company under slightly different names.
    existing.push({
      id: -1,
      empresa: c.empresa,
      nombre_comercial: null,
      web: c.web,
      email: c.email,
      telefono: c.telefono,
      direccion: c.direccion,
      municipio: c.municipio,
      codigo_postal: c.codigoPostal,
      provincia: c.provincia,
      contacto: null,
      cargo: null,
      clasificacion: c.clasificacion,
      observaciones: null,
      valoracion: null,
      estado: null,
      fecha_ultima_visita: null,
      proxima_visita: null,
      competidor_actual: null,
      objeciones: null,
      producto_recomendado: null,
      argumentario: null,
      zona_ruta: null,
      netel_prioridad: null,
      netel_score: null,
      netel_estrategia_entrada: null,
      netel_argumento: null,
      netel_objecion_probable: null,
      netel_respuesta_sugerida: null,
      netel_pregunta_recepcion: null,
      nivel_investigacion: null,
      fuente_investigacion: null,
      fecha_verificacion_investig: null,
    });
  }

  revalidatePath("/empresas");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { created, skipped: skippedNames.length, skippedNames };
}
