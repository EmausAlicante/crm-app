"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createCompany, deleteCompany, updateCompany } from "@/lib/companies";
import { ESPECIALIZACIONES, MARCAS, SCORE_FIELDS } from "@/lib/constants";
import type { CompanyInput } from "@/lib/types";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function buildInput(formData: FormData): CompanyInput {
  const input = {
    empresa: str(formData, "empresa") ?? "",
    nombreComercial: str(formData, "nombreComercial"),
    direccion: str(formData, "direccion"),
    municipio: str(formData, "municipio"),
    codigoPostal: str(formData, "codigoPostal"),
    provincia: str(formData, "provincia"),
    latitud: num(formData, "latitud"),
    longitud: num(formData, "longitud"),
    web: str(formData, "web"),
    email: str(formData, "email"),
    telefono: str(formData, "telefono"),
    whatsapp: str(formData, "whatsapp"),
    contacto: str(formData, "contacto"),
    cargo: str(formData, "cargo"),
    clasificacion: str(formData, "clasificacion"),
    estado: str(formData, "estado") ?? "Pendiente",
    fechaUltimaVisita: str(formData, "fechaUltimaVisita"),
    proximaVisita: str(formData, "proximaVisita"),
    proximaVisitaHora: str(formData, "proximaVisitaHora"),
    competidorActual: str(formData, "competidorActual"),
    objeciones: str(formData, "objeciones"),
    observaciones: str(formData, "observaciones"),
    productoRecomendado: str(formData, "productoRecomendado"),
    argumentario: str(formData, "argumentario"),
    zonaRuta: str(formData, "zonaRuta"),
    jornada: str(formData, "jornada"),
    cif: str(formData, "cif"),
    razonSocialFiscal: str(formData, "razonSocialFiscal"),
    iban: str(formData, "iban"),
    banco: str(formData, "banco"),
    titularCuenta: str(formData, "titularCuenta"),
    formaPago: str(formData, "formaPago"),
    plazoPago: str(formData, "plazoPago"),
    limiteCredito: str(formData, "limiteCredito"),
    lopdFirmado: bool(formData, "lopdFirmado"),
    lopdFechaFirma: str(formData, "lopdFechaFirma"),
    valoracion: num(formData, "valoracion"),
    // A manual save always counts as confirming the record, clearing the
    // "AI estimate, not yet reviewed" flag regardless of which tab was edited.
    scoreEstimadoIa: false,
    // --- Módulo NETEL ---
    netelPrioridad: str(formData, "netelPrioridad"),
    netelScore: num(formData, "netelScore"),
    netelEstrategiaEntrada: str(formData, "netelEstrategiaEntrada"),
    netelArgumento: str(formData, "netelArgumento"),
    netelObjecionProbable: str(formData, "netelObjecionProbable"),
    netelRespuestaSugerida: str(formData, "netelRespuestaSugerida"),
    netelPreguntaRecepcion: str(formData, "netelPreguntaRecepcion"),
    nivelInvestigacion: str(formData, "nivelInvestigacion"),
    fuenteInvestigacion: str(formData, "fuenteInvestigacion"),
    fechaVerificacionInvestigacion: str(formData, "fechaVerificacionInvestigacion"),
  } as CompanyInput;

  for (const { key } of ESPECIALIZACIONES) input[key] = bool(formData, key);
  for (const { key } of MARCAS) input[key] = bool(formData, key);
  for (const { key } of SCORE_FIELDS) input[key] = num(formData, key);

  return input;
}

export async function saveCompanyAction(formData: FormData) {
  const idRaw = formData.get("id");
  const input = buildInput(formData);

  let id: number;
  if (idRaw && typeof idRaw === "string" && idRaw !== "") {
    id = Number(idRaw);
    await updateCompany(id, input);
  } else {
    id = await createCompany(input);
  }

  revalidatePath("/empresas");
  revalidatePath(`/empresas/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/rutas");
  redirect(`/empresas/${id}?guardado=1`);
}

// Lightweight partial update for the Kanban board — moving a card between
// columns shouldn't require resubmitting the whole company form.
export async function updateEstadoAction(id: number, estado: string) {
  await updateCompany(id, { estado });
  revalidatePath("/empresas");
  revalidatePath(`/empresas/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/rutas");
}

export async function deleteCompanyAction(formData: FormData) {
  const idRaw = formData.get("id");
  if (typeof idRaw !== "string") return;
  await deleteCompany(Number(idRaw));
  revalidatePath("/empresas");
  revalidatePath("/dashboard");
  revalidatePath("/rutas");
  redirect("/empresas");
}

// Bulk variant for the Empresas list's multi-select toolbar — unlike the
// single-company delete above, this runs while already on /empresas, so it
// revalidates instead of redirecting.
export async function deleteCompaniesAction(ids: number[]) {
  for (const id of ids) {
    await deleteCompany(id);
  }
  revalidatePath("/empresas");
  revalidatePath("/dashboard");
  revalidatePath("/rutas");
}
