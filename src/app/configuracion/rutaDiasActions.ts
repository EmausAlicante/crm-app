"use server";

import { revalidatePath } from "next/cache";
import { createRutaDia, deleteRutaDia, updateRutaDia } from "@/lib/rutaDias";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createRutaDiaAction(formData: FormData) {
  const dia = str(formData, "dia");
  if (!dia) return;
  await createRutaDia({
    dia,
    zona: str(formData, "zona"),
    notas: str(formData, "notas"),
    orden: Number(formData.get("orden")) || 0,
  });
  revalidatePath("/configuracion");
  revalidatePath("/rutas");
}

export async function updateRutaDiaAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const dia = str(formData, "dia");
  if (!dia) return;
  await updateRutaDia(id, {
    dia,
    zona: str(formData, "zona"),
    notas: str(formData, "notas"),
    orden: Number(formData.get("orden")) || 0,
  });
  revalidatePath("/configuracion");
  revalidatePath("/rutas");
}

export async function deleteRutaDiaAction(formData: FormData) {
  const id = Number(formData.get("id"));
  await deleteRutaDia(id);
  revalidatePath("/configuracion");
  revalidatePath("/rutas");
}
