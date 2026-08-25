"use server";

import { revalidatePath } from "next/cache";
import { createCatalogOption, deleteCatalogOption, type CatalogType } from "@/lib/catalog";

export async function createCatalogOptionAction(formData: FormData) {
  const tipo = formData.get("tipo");
  const valor = formData.get("valor");
  if (typeof tipo !== "string" || typeof valor !== "string") return;
  const trimmed = valor.trim();
  if (!trimmed) return;
  await createCatalogOption(tipo as CatalogType, trimmed);
  revalidatePath("/configuracion");
}

export async function deleteCatalogOptionAction(formData: FormData) {
  const id = Number(formData.get("id"));
  await deleteCatalogOption(id);
  revalidatePath("/configuracion");
}
