"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Reads the pending state of the nearest parent <form> — must be rendered
// inside that form. Gives immediate visual feedback on tap (disabled + label
// swap) instead of a submit that looks like it did nothing for a few seconds,
// which matters on the "Marcar hecha" flow used repeatedly on patchy signal.
export default function SubmitButton({
  children,
  pendingText,
  className = "",
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-50 disabled:cursor-wait`}>
      {pending ? pendingText : children}
    </button>
  );
}
