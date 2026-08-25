"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { geocodeMissingAction } from "../geocodeActions";

const BATCH_SIZE = 4; // must match geocodeActions.ts — used only to detect "no more pending"
const MAX_BATCHES = 80; // safety cap: ~320 companies before the button needs a fresh click

export default function GeocodeButton({ missingCount }: { missingCount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      let totalProcessed = 0;
      let totalUpdated = 0;
      for (let i = 0; i < MAX_BATCHES; i++) {
        const result = await geocodeMissingAction();
        totalProcessed += result.processed;
        totalUpdated += result.updated;
        setMessage(`Localizadas ${totalUpdated} de ${totalProcessed} empresa(s) revisadas… (puedes seguir esperando)`);
        router.refresh();
        if (result.processed < BATCH_SIZE) break; // fewer than a full batch = nothing left pending
      }
      setMessage((prev) => (prev ? prev.replace("… (puedes seguir esperando)", ", completado.") : prev));
    });
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-blue-600 text-white text-sm px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Geocodificando…" : `Geocodificar (${missingCount} pendientes)`}
      </button>
      {message && <p className="text-xs text-slate-500 max-w-xs text-right">{message}</p>}
    </div>
  );
}
