import type { CatalogOption, CatalogType } from "@/lib/catalog";
import { createCatalogOptionAction, deleteCatalogOptionAction } from "./catalogActions";

export default function CatalogSection({
  title,
  tipo,
  options,
}: {
  title: string;
  tipo: CatalogType;
  options: CatalogOption[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <h2 className="font-medium text-slate-800">{title}</h2>

      {options.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {options.map((o) => (
            <li key={o.id} className="flex items-center gap-2 rounded-full border border-slate-200 pl-3 pr-1 py-1 text-sm">
              {o.valor}
              <form action={deleteCatalogOptionAction}>
                <input type="hidden" name="id" value={o.id} />
                <button
                  type="submit"
                  title={`Eliminar "${o.valor}"`}
                  aria-label={`Eliminar "${o.valor}"`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No hay opciones todavía.</p>
      )}

      <form action={createCatalogOptionAction} className="flex items-center gap-2">
        <input type="hidden" name="tipo" value={tipo} />
        <input
          name="valor"
          required
          placeholder="Nueva opción..."
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          + Añadir
        </button>
      </form>
    </section>
  );
}
