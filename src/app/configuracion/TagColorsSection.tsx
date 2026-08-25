"use client";

import { useState } from "react";
import { contrastTextColor, DEFAULT_TAG_COLOR } from "@/lib/color";
import { resetTagColorAction, saveTagColorAction } from "./tagColorsActions";

function TagRow({ tag, color, isCustom }: { tag: string; color: string; isCustom: boolean }) {
  const [value, setValue] = useState(color);
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="text-xs font-medium rounded-full px-2.5 py-1 truncate max-w-[240px] shrink-0"
        style={{ backgroundColor: value, color: contrastTextColor(value) }}
      >
        {tag}
      </span>
      <form action={saveTagColorAction} className="flex items-center gap-2">
        <input type="hidden" name="tag" value={tag} />
        <input
          type="color"
          name="color"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-10 rounded border border-slate-300 cursor-pointer"
          aria-label={`Color para la etiqueta ${tag}`}
        />
        <button type="submit" className="text-xs text-blue-600 hover:underline">
          Guardar
        </button>
      </form>
      {isCustom && (
        <form action={resetTagColorAction}>
          <input type="hidden" name="tag" value={tag} />
          <button type="submit" className="text-xs text-slate-400 hover:text-red-600">
            Quitar color
          </button>
        </form>
      )}
    </div>
  );
}

export default function TagColorsSection({
  tags,
  tagColors,
}: {
  tags: string[];
  tagColors: Record<string, string>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
      <div>
        <h2 className="font-medium text-slate-800">Colores de etiquetas</h2>
        <p className="text-sm text-slate-500 mt-1">
          Asigna un color a cada etiqueta de clasificación (por ejemplo &quot;No interesado&quot; en rojo) para
          identificarlas de un vistazo en el listado de Empresas.
        </p>
      </div>
      {tags.length === 0 ? (
        <p className="text-sm text-slate-400">
          Todavía no hay etiquetas en ninguna empresa. En cuanto añadas alguna en Clasificación, aparecerá aquí para
          poder darle color.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {tags.map((tag) => (
            <TagRow key={tag} tag={tag} color={tagColors[tag] ?? DEFAULT_TAG_COLOR} isCustom={tag in tagColors} />
          ))}
        </div>
      )}
    </section>
  );
}
