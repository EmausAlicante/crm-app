"use server";

import { revalidatePath } from "next/cache";
import { deleteTagColor, setTagColor } from "@/lib/tagColors";

export async function saveTagColorAction(formData: FormData) {
  const tag = formData.get("tag");
  const color = formData.get("color");
  if (typeof tag !== "string" || !tag.trim() || typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
  await setTagColor(tag.trim(), color);
  revalidatePath("/configuracion");
  revalidatePath("/empresas");
}

export async function resetTagColorAction(formData: FormData) {
  const tag = formData.get("tag");
  if (typeof tag !== "string" || !tag.trim()) return;
  await deleteTagColor(tag.trim());
  revalidatePath("/configuracion");
  revalidatePath("/empresas");
}
