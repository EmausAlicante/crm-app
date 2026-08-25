"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createPipelineEstado, deletePipelineEstado, updatePipelineEstado } from "@/lib/pipelineEstados";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

function colorOf(formData: FormData): string {
  const v = formData.get("color");
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#64748b";
}

function revalidateAll() {
  revalidatePath("/configuracion");
  revalidatePath("/empresas");
  revalidatePath("/dashboard");
}

export async function createPipelineEstadoAction(formData: FormData) {
  const nombre = str(formData, "nombre");
  if (!nombre) return;
  await createPipelineEstado(nombre, Number(formData.get("orden")) || 0, colorOf(formData));
  revalidateAll();
}

export async function updatePipelineEstadoAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const nombre = str(formData, "nombre");
  if (!nombre) return;
  await updatePipelineEstado(id, { nombre, orden: Number(formData.get("orden")) || 0, color: colorOf(formData) });
  revalidateAll();
}

export async function deletePipelineEstadoAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const ok = await deletePipelineEstado(id);
  revalidateAll();
  if (!ok) redirect("/configuracion?pipelineError=1");
}
