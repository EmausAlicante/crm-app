"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { DOCUMENT_CATEGORIAS } from "@/lib/types";
import { createDocumentRecordAction } from "./actions";

export default function UploadDocumentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("archivo");
    if (!(file instanceof File) || file.size === 0) return;

    const nombre = String(formData.get("nombre") ?? "").trim() || file.name;
    const categoria = String(formData.get("categoria") ?? "Otro");

    setError(null);
    startTransition(async () => {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const blob = await upload(`documentos/${Date.now()}-${safeName}`, file, {
          access: "public",
          handleUploadUrl: "/api/documentos/upload",
        });
        await createDocumentRecordAction({
          nombre,
          categoria,
          url: blob.url,
          nombreArchivo: file.name,
          tamanoBytes: file.size,
        });
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir el archivo.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Nombre (opcional)</span>
        <input name="nombre" placeholder="Ej: Catálogo MATIC 2026" className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Categoría</span>
        <select name="categoria" defaultValue="Otro" className="rounded-lg border border-slate-300 px-3 py-2">
          {DOCUMENT_CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-slate-600">Archivo *</span>
        <input name="archivo" type="file" required className="text-xs" />
      </label>
      {error && <p className="sm:col-span-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Subiendo…" : "Subir"}
      </button>
    </form>
  );
}
