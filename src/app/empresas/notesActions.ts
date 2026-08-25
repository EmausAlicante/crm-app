"use server";

import { revalidatePath } from "next/cache";
import { createNote, deleteNote, updateNote } from "@/lib/notes";
import { getSettings } from "@/lib/settings";

// DD-MM-YYYY, built from formatToParts rather than toLocaleDateString so the
// separator and zero-padding are exact regardless of locale/runtime quirks.
function dateStamp(timezone: string): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}

export async function createNoteAction(formData: FormData) {
  const companyId = Number(formData.get("companyId"));
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  const settings = await getSettings();
  const fecha = dateStamp(settings.timezone);
  await createNote(companyId, `**${fecha}:**\n${texto}`);
  revalidatePath(`/empresas/${companyId}`);
}

export async function updateNoteAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  await updateNote(id, texto);
  revalidatePath(`/empresas/${companyId}`);
}

export async function deleteNoteAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  await deleteNote(id);
  revalidatePath(`/empresas/${companyId}`);
}
