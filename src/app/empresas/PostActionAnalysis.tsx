"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Recording } from "@/lib/types";
import AnalysisCard from "./AnalysisCard";

// Shown after "Marcar hecha" when the user logged what happened on the call/
// email/visit — the AI analysis (same engine used for meeting recordings) runs
// synchronously before the redirect, so it's ready to show immediately here.
//
// Same always-mounted pattern as NextActionBanner: both `visible` AND the
// recording itself are captured into local state once on mount. Stripping
// ?analisisId=... from the URL re-renders this with recording=null — without
// the local snapshot, the card would read that live (now-null) prop in its
// body and vanish right after appearing, even with `visible` still true.
export default function PostActionAnalysis({ recording }: { recording: Recording | null }) {
  const router = useRouter();
  const [saved] = useState(recording);
  const [visible, setVisible] = useState(!!recording);
  const [stripped, setStripped] = useState(false);

  useEffect(() => {
    if (!recording || stripped) return;
    setStripped(true);
    router.replace(window.location.pathname, { scroll: false });
  }, [recording, stripped, router]);

  if (!visible || !saved) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-emerald-800">✓ Analizado con IA — próximo paso sugerido</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs text-emerald-600 hover:underline shrink-0 whitespace-nowrap"
        >
          Cerrar
        </button>
      </div>
      {saved.analysis ? (
        <AnalysisCard analysis={saved.analysis} />
      ) : saved.analysisError ? (
        <p className="text-xs text-red-600">No se pudo analizar: {saved.analysisError}</p>
      ) : (
        <p className="text-xs text-slate-500">Analizando…</p>
      )}
    </div>
  );
}
