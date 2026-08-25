"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SaveButton({ formId, justSaved }: { formId: string; justSaved: boolean }) {
  const router = useRouter();
  const [showSaved, setShowSaved] = useState(justSaved);

  useEffect(() => {
    if (!justSaved) return;
    // Strip ?guardado=1 from the URL without a server round-trip.
    router.replace(window.location.pathname, { scroll: false });
    const timeout = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timeout);
    // Deliberately mount-only: `justSaved` only reflects the URL at load time. Stripping
    // the query param changes it to false on the next render, which would otherwise
    // re-run this effect and cancel the timeout before it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="submit"
      form={formId}
      className={`rounded-lg text-sm px-5 py-2.5 shadow-lg transition-colors ${
        showSaved ? "bg-emerald-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {showSaved ? "✓ Guardado" : "Guardar cambios"}
    </button>
  );
}
