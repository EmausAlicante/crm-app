"use client";

import { useMemo, useRef, useState } from "react";
import { COMPANY_FORM_ID } from "./formFields";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Free-text "clasificacion" as a tag picker: suggests every tag already used
// across other companies (via `suggestions`) so the same concept doesn't get
// typed a dozen slightly different ways, but still lets you create a brand
// new tag on the fly when none of the suggestions fit. Submits as the same
// single comma-separated string the rest of the form/DB already expects, via
// a hidden input — no server-side changes needed.
export default function ClasificacionTagPicker({
  defaultValue,
  suggestions,
}: {
  defaultValue?: string | null;
  suggestions: string[];
}) {
  const [tags, setTags] = useState<string[]>(() => parseTags(defaultValue ?? ""));
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase();
    return suggestions
      .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
      .filter((s) => !q || s.toLowerCase().includes(q))
      .slice(0, 8);
  }, [suggestions, tags, input]);

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (!tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTags((prev) => [...prev, value]);
    }
    setInput("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const trimmedInput = input.trim();
  const exactMatch = suggestions.some((s) => s.toLowerCase() === trimmedInput.toLowerCase());
  const canCreate = trimmedInput !== "" && !exactMatch && !tags.some((t) => t.toLowerCase() === trimmedInput.toLowerCase());

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">Clasificación</span>
      <input type="hidden" form={COMPANY_FORM_ID} name="clasificacion" value={tags.join(", ")} readOnly />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:ring-1 focus-within:ring-blue-500">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Quitar ${tag}`}
                className="text-blue-400 hover:text-blue-700"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? "Fabricante, Instalador, SAT..." : ""}
            className="min-w-[120px] flex-1 border-none py-0.5 text-sm outline-none"
          />
        </div>
        {open && (filtered.length > 0 || canCreate) && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(s)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(trimmedInput)}
                className="block w-full px-3 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50"
              >
                + Crear &quot;{trimmedInput}&quot;
              </button>
            )}
          </div>
        )}
      </div>
    </label>
  );
}
