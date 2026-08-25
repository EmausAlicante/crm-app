"use server";

import { revalidatePath } from "next/cache";
import { createContact, deleteContact, updateContact } from "@/lib/contacts";
import { uploadFile } from "@/lib/blob";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function saveContactAction(formData: FormData) {
  const companyId = Number(formData.get("companyId"));
  const idRaw = formData.get("id");
  const photo = formData.get("foto");

  let fotoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    fotoUrl = await uploadFile(photo, `contacts/${companyId}`);
  }

  const input = {
    companyId,
    nombre: str(formData, "nombre") ?? "",
    cargo: str(formData, "cargo"),
    email: str(formData, "email"),
    telefono: str(formData, "telefono"),
    notas: str(formData, "notas"),
    esPrincipal: formData.get("esPrincipal") === "on",
    fotoUrl,
    rolNetel: str(formData, "rolNetel"),
    linkedinUrl: str(formData, "linkedinUrl"),
  };

  if (idRaw && typeof idRaw === "string" && idRaw !== "") {
    const patch: Partial<typeof input> = { ...input };
    if (!fotoUrl) delete patch.fotoUrl; // keep existing photo if none uploaded
    await updateContact(Number(idRaw), patch);
  } else {
    await createContact(input);
  }

  revalidatePath(`/empresas/${companyId}`);
}

export async function deleteContactAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  await deleteContact(id);
  revalidatePath(`/empresas/${companyId}`);
}
