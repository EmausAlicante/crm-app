"use server";

import { revalidatePath } from "next/cache";
import { getSettings, updateSettings } from "@/lib/settings";
import { uploadFile, deleteFile } from "@/lib/blob";

export async function saveTimezoneAction(formData: FormData) {
  const timezone = formData.get("timezone");
  if (typeof timezone !== "string" || !timezone) return;
  await updateSettings({ timezone });
  revalidatePath("/configuracion");
}

export async function saveNotifyEmailAction(formData: FormData) {
  const raw = formData.get("notifyEmail");
  const notifyEmail = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
  await updateSettings({ notifyEmail });
  revalidatePath("/configuracion");
}

export async function uploadAppLogoAction(formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return;
  const previous = await getSettings();
  const url = await uploadFile(file, "app-settings");
  await updateSettings({ logoUrl: url });
  if (previous.logoUrl) await deleteFile(previous.logoUrl);
  revalidatePath("/configuracion");
  revalidatePath("/", "layout");
}

export async function deleteAppLogoAction(_formData: FormData) {
  const settings = await getSettings();
  if (settings.logoUrl) await deleteFile(settings.logoUrl);
  await updateSettings({ logoUrl: null });
  revalidatePath("/configuracion");
  revalidatePath("/", "layout");
}
