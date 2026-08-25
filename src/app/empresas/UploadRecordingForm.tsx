"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { createRecordingFromUrlAction } from "./mediaActions";

export default function UploadRecordingForm({ companyId, submitLabel }: { companyId: number; submitLabel: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("audio");
    if (!(file instanceof File) || file.size === 0) return;

    const titulo = String(formData.get("titulo") ?? "").trim() || null;
    const notas = String(formData.get("notas") ?? "").trim() || null;

    setError(null);
    startTransition(async () => {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const blob = await upload(`recordings/${companyId}/${Date.now()}-${safeName}`, file, {
          access: "public",
          handleUploadUrl: "/api/documentos/upload",
        });
        await createRecordingFromUrlAction({
          companyId,
          titulo,
          notas,
          audioUrl: blob.url,
          audioFileName: file.name,
        });
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir la grabación.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Título</span>
        <input name="titulo" placeholder="Ej: Reunión 6 julio" className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Archivo de audio</span>
        <input name="audio" type="file" accept="audio/*" required className="text-xs pt-2" />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-slate-600">Notas</span>
        <input name="notas" className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      {error && <p className="sm:col-span-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Subiendo…" : submitLabel}
      </button>
    </form>
  );
}
