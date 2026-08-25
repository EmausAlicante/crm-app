"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSync() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/emails/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error al sincronizar.");
          return;
        }
        setMessage(
          `${data.processed} email(s) procesados · ${data.linked} vinculados a empresas · ${data.notesCreated} acción(es) creadas en el pipeline.` +
            (data.skippedAlreadySeen ? ` (${data.skippedAlreadySeen} ya estaban procesados)` : "")
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al sincronizar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="rounded-lg bg-blue-600 text-white text-sm px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Sincronizando…" : "Sincronizar correo"}
      </button>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
