"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { TrashIcon } from "../icons";

export default function DocumentUploader({
  label,
  companyId,
  documentUrl,
  folder,
  uploadAction,
  deleteAction,
}: {
  label: string;
  companyId: number;
  documentUrl: string | null;
  folder: string;
  uploadAction: (companyId: number, url: string) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const blob = await upload(`${folder}/${companyId}/${Date.now()}-${safeName}`, file, {
          access: "public",
          handleUploadUrl: "/api/documentos/upload",
        });
        await uploadAction(companyId, blob.url);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir el documento.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center gap-3">
        {documentUrl && (
          <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
            Ver documento actual
          </a>
        )}
        <input type="file" className="text-xs" disabled={isPending} onChange={handleChange} />
        {isPending && <span className="text-xs text-slate-400">Subiendo…</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
        {documentUrl && (
          <form action={deleteAction}>
            <input type="hidden" name="companyId" value={companyId} />
            <button type="submit" title="Eliminar" aria-label="Eliminar documento" className="text-red-400 hover:text-red-600">
              <TrashIcon className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
