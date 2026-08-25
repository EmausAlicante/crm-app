"use server";

import { revalidatePath } from "next/cache";
import { createDocument, deleteDocument, getDocument } from "@/lib/documents";
import { deleteFile } from "@/lib/blob";
import { DOCUMENT_CATEGORIAS, type DocumentCategoria } from "@/lib/types";

// The file itself is uploaded client-side directly to Vercel Blob (see
// UploadDocumentForm.tsx + api/documentos/upload/route.ts) to avoid the Server
// Action body size limit. This action only persists the resulting metadata.
export async function createDocumentRecordAction(input: {
  nombre: string;
  categoria: string;
  url: string;
  nombreArchivo: string;
  tamanoBytes: number;
}) {
  const categoria = (DOCUMENT_CATEGORIAS as readonly string[]).includes(input.categoria)
    ? (input.categoria as DocumentCategoria)
    : "Otro";

  await createDocument({
    nombre: input.nombre.trim() || input.nombreArchivo,
    categoria,
    url: input.url,
    nombreArchivo: input.nombreArchivo,
    tamanoBytes: input.tamanoBytes,
  });

  revalidatePath("/documentos");
}

export async function deleteDocumentAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const doc = await getDocument(id);
  if (doc) await deleteFile(doc.url);
  await deleteDocument(id);
  revalidatePath("/documentos");
}
