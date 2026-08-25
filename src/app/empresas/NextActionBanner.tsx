"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Shown right after marking a pipeline action as done — a soft nudge to
// schedule the next one (call, email, visit...) instead of letting the
// company go silent. Dismissible; never blocks anything.
//
// Always mounted by the parent (never conditionally rendered) so that
// stripping ?siguiente=1 from the URL — which triggers a server re-render
// with sugerirSiguiente=false — re-renders this component in place instead
// of unmounting it. `visible` is seeded from the prop once and then lives
// entirely in local state, so the later prop flip doesn't hide it again.
export default function NextActionBanner({ sugerirSiguiente }: { sugerirSiguiente: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(sugerirSiguiente);
  const [stripped, setStripped] = useState(false);

  useEffect(() => {
    if (!sugerirSiguiente || stripped) return;
    setStripped(true);
    router.replace(window.location.pathname, { scroll: false });
  }, [sugerirSiguiente, stripped, router]);

  if (!visible) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3 text-sm">
      <span className="text-amber-800">
        ✓ Acción marcada como hecha. ¿Cuál es la siguiente (llamada, email, visita...) y para cuándo?
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-amber-600 hover:underline shrink-0 whitespace-nowrap"
      >
        Ahora no
      </button>
    </div>
  );
}
