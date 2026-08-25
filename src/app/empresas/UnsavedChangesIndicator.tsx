"use client";

import { useEffect, useState } from "react";

// Fields across every tab associate to the form via a `form="…"` attribute
// rather than DOM nesting (see formFields.tsx), so a plain document-level
// listener catches edits regardless of which tab is active — no need to
// walk the tree looking for the form's own children.
export default function UnsavedChangesIndicator({ formId }: { formId: string }) {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    function markDirty(e: Event) {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (target.form === form) setDirty(true);
    }
    function markClean() {
      setDirty(false);
    }

    document.addEventListener("input", markDirty);
    document.addEventListener("change", markDirty);
    form.addEventListener("submit", markClean);
    return () => {
      document.removeEventListener("input", markDirty);
      document.removeEventListener("change", markDirty);
      form.removeEventListener("submit", markClean);
    };
  }, [formId]);

  if (!dirty) return null;

  return (
    <button
      type="submit"
      form={formId}
      title="Cambios sin guardar — pulsa para guardar"
      aria-label="Guardar cambios"
      className="inline-flex text-amber-500 hover:text-amber-600"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M6.5 19a4.5 4.5 0 0 1-.4-8.98 6 6 0 0 1 11.4-2.3A4.5 4.5 0 0 1 17.5 19h-11Zm5.5-9v4.5m0 0-1.75-1.75M12 14.5l1.75-1.75" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
