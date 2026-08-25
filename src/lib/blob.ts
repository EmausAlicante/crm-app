import { put, del } from "@vercel/blob";

export const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function uploadFile(file: File, folder: string): Promise<string> {
  if (!blobConfigured) {
    throw new Error(
      "Almacenamiento de archivos no configurado. Activa Vercel Blob en tu proyecto y añade BLOB_READ_WRITE_TOKEN a .env.local."
    );
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const blob = await put(`${folder}/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function deleteFile(url: string): Promise<void> {
  if (!blobConfigured) return;
  try {
    await del(url);
  } catch {
    // best-effort cleanup; ignore if already gone
  }
}
