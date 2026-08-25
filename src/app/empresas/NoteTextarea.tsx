"use client";

import { useRef } from "react";

// Wraps the current textarea selection in `marker`, or strips it if the
// selection already sits directly between a pair of markers — checked by
// looking just outside the selection, since after wrapping, the selection
// is reset to the inner text only (not the markers themselves). Stores
// plain marked-up text rather than HTML from a contentEditable, so there's
// nothing to sanitize when rendering it back later.
function toggleWrap(el: HTMLTextAreaElement, marker: string) {
  const { selectionStart, selectionEnd, value } = el;
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const selected = value.slice(selectionStart, selectionEnd) || "texto";

  // For the single-char italic marker, don't treat the edge of a "**" bold
  // pair as a match — otherwise italic-toggling text already inside a bold
  // pair would strip the bold markers instead.
  const isEdgeMatch = (s: string, atStart: boolean) => {
    const hit = atStart ? s.startsWith(marker) : s.endsWith(marker);
    if (!hit) return false;
    if (marker !== "*") return true;
    return atStart ? !s.startsWith("**") : !s.endsWith("**");
  };

  const wrapped = isEdgeMatch(before, false) && isEdgeMatch(after, true);

  let newValue: string;
  let selStart: number;
  if (wrapped) {
    const newBefore = before.slice(0, -marker.length);
    const newAfter = after.slice(marker.length);
    newValue = `${newBefore}${selected}${newAfter}`;
    selStart = newBefore.length;
  } else {
    newValue = `${before}${marker}${selected}${marker}${after}`;
    selStart = before.length + marker.length;
  }

  el.value = newValue;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(selStart, selStart + selected.length);
}

// Prefixes every line touched by the selection with "- " (or strips it if
// every touched line already has it) — mirrors toggleWrap's "check what's
// already there" approach, just at line granularity instead of character.
function toggleListPrefix(el: HTMLTextAreaElement) {
  const { selectionStart, selectionEnd, value } = el;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  // If the selection's last character is the newline ending a line (e.g. the
  // user dragged over whole lines including the trailing break), treat that
  // as the boundary rather than searching past it — otherwise the untouched
  // line right after gets swept in too.
  let lineEnd: number;
  if (selectionEnd > selectionStart && value[selectionEnd - 1] === "\n") {
    lineEnd = selectionEnd - 1;
  } else {
    const nextBreak = value.indexOf("\n", selectionEnd);
    lineEnd = nextBreak === -1 ? value.length : nextBreak;
  }

  const lines = value.slice(lineStart, lineEnd).split("\n");
  const contentLines = lines.filter((l) => l.trim() !== "");
  const allPrefixed = contentLines.length > 0 && contentLines.every((l) => l.startsWith("- "));

  const newLines = lines.map((l) => {
    if (l.trim() === "") return l;
    if (allPrefixed) return l.slice(2);
    return l.startsWith("- ") ? l : `- ${l}`;
  });
  const newBlock = newLines.join("\n");

  el.value = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(lineStart, lineStart + newBlock.length);
}

export default function NoteTextarea({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => ref.current && toggleWrap(ref.current, "**")}
          title="Negrita"
          className="w-7 h-7 text-sm font-bold border border-slate-300 rounded hover:bg-slate-50"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => ref.current && toggleWrap(ref.current, "*")}
          title="Cursiva"
          className="w-7 h-7 text-sm italic border border-slate-300 rounded hover:bg-slate-50"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => ref.current && toggleListPrefix(ref.current)}
          title="Lista con guiones"
          className="w-7 h-7 text-sm border border-slate-300 rounded hover:bg-slate-50"
        >
          ≡
        </button>
      </div>
      <textarea
        ref={ref}
        name={name}
        required
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={2}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
