"use server";

import { revalidatePath } from "next/cache";
import { createEmailAccount, deleteEmailAccount, setEmailAccountActivo } from "@/lib/emailAccounts";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createEmailAccountAction(formData: FormData) {
  const email = str(formData, "email");
  const imapPassword = str(formData, "imapPassword");
  if (!email || !imapPassword) return;

  await createEmailAccount({
    label: str(formData, "label"),
    email,
    imapHost: str(formData, "imapHost") ?? "imap.gmail.com",
    imapPort: Number(str(formData, "imapPort") ?? "993"),
    imapPassword,
  });

  revalidatePath("/emails");
}

export async function deleteEmailAccountAction(formData: FormData) {
  const id = Number(formData.get("id"));
  await deleteEmailAccount(id);
  revalidatePath("/emails");
}

export async function toggleEmailAccountAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await setEmailAccountActivo(id, activo);
  revalidatePath("/emails");
}
