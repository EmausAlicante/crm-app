import Link from "next/link";
import { listCompanies, listDistinctMunicipios, listDistinctProvincias } from "@/lib/companies";
import { listPipelineEstadoColors, listPipelineEstadoNames } from "@/lib/pipelineEstados";
import { getSettings } from "@/lib/settings";
import { listTagColors } from "@/lib/tagColors";
import { ZONAS } from "@/lib/constants";
import type { Company } from "@/lib/types";
import { DownloadIcon, FilterIcon, MapIcon, PlusIcon, UploadIcon } from "../icons";
import EmpresasTable from "./EmpresasTable";
import EmpresasKanban from "./EmpresasKanban";
import EmpresasGroupedTree from "./EmpresasGroupedTree";
import { sortValue, type SortField } from "./columns";
import { GROUPABLE_FIELDS, groupCompanies, isGroupableField, type GroupableField } from "./grouping";

export const dynamic = "force-dynamic";

const PAGE_SIZES = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

const KNOWN_SORT_FIELDS: SortField[] = [
  "empresa",
  "municipio",
  "provincia",
  "zonaRuta",
  "clasificacion",
  "estado",
  "valoracion",
  "telefono",
  "email",
  "web",
  "contacto",
  "cargo",
  "direccion",
  "codigoPostal",
  "cif",
  "fechaUltimaVisita",
  "proximaVisita",
  "updatedAt",
];

function sortCompanies(companies: Company[], field: SortField, dir: "asc" | "desc"): Company[] {
  const sorted = [...companies].sort((a, b) => {
    const va = sortValue(a, field);
    const vb = sortValue(b, field);
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}

function Pagination({ page, totalPages, baseQuery }: { page: number; totalPages: number; baseQuery: string }) {
  if (totalPages <= 1) return null;
  const prevQuery = new URLSearchParams(baseQuery);
  prevQuery.set("page", String(page - 1));
  const nextQuery = new URLSearchParams(baseQuery);
  nextQuery.set("page", String(page + 1));
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={`/empresas?${prevQuery.toString()}`} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            ← Anterior
          </Link>
        ) : (
          <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-300">← Anterior</span>
        )}
        {page < totalPages ? (
          <Link href={`/empresas?${nextQuery.toString()}`} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Siguiente →
          </Link>
        ) : (
          <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-300">Siguiente →</span>
        )}
      </div>
    </div>
  );
}

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const estado = typeof sp.estado === "string" ? sp.estado : "";
  const zona = typeof sp.zona === "string" ? sp.zona : "";
  const provincia = typeof sp.provincia === "string" ? sp.provincia : "";
  const municipio = typeof sp.municipio === "string" ? sp.municipio : "";
  const sortParam = typeof sp.sort === "string" ? sp.sort : "";
  const sort: SortField = KNOWN_SORT_FIELDS.includes(sortParam as SortField) ? (sortParam as SortField) : "empresa";
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const vista = sp.vista === "kanban" ? "kanban" : "lista";
  const agrupar1Raw = typeof sp.agrupar1 === "string" ? sp.agrupar1 : "";
  const agrupar2Raw = typeof sp.agrupar2 === "string" ? sp.agrupar2 : "";
  const agruparFields: GroupableField[] = [
    ...(isGroupableField(agrupar1Raw) ? [agrupar1Raw] : []),
    ...(isGroupableField(agrupar2Raw) && agrupar2Raw !== agrupar1Raw ? [agrupar2Raw] : []),
  ];
  const pageSizeRaw = typeof sp.pageSize === "string" ? parseInt(sp.pageSize, 10) : DEFAULT_PAGE_SIZE;
  const pageSize = (PAGE_SIZES as readonly number[]).includes(pageSizeRaw) ? pageSizeRaw : DEFAULT_PAGE_SIZE;
  const pageRaw = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;

  const [companies, provincias, municipios, estados, settings, tagColors, estadoColors] = await Promise.all([
    listCompanies({
      search: q || undefined,
      estado: estado || undefined,
      zonaRuta: zona || undefined,
      provincia: provincia || undefined,
      municipio: municipio || undefined,
    }),
    listDistinctProvincias(),
    listDistinctMunicipios(provincia || undefined),
    listPipelineEstadoNames(),
    getSettings(),
    listTagColors(),
    listPipelineEstadoColors(),
  ]);
  const sortedCompanies = sortCompanies(companies, sort, dir);
  const grouped = agruparFields.length > 0;
  const groups = grouped ? groupCompanies(sortedCompanies, agruparFields) : [];

  const totalPages = Math.max(1, Math.ceil(sortedCompanies.length / pageSize));
  const page = Math.min(Math.max(pageRaw || 1, 1), totalPages);
  const pageCompanies = sortedCompanies.slice((page - 1) * pageSize, page * pageSize);

  const baseQuery = new URLSearchParams();
  if (q) baseQuery.set("q", q);
  if (estado) baseQuery.set("estado", estado);
  if (zona) baseQuery.set("zona", zona);
  if (provincia) baseQuery.set("provincia", provincia);
  if (municipio) baseQuery.set("municipio", municipio);
  if (agruparFields[0]) baseQuery.set("agrupar1", agruparFields[0]);
  if (agruparFields[1]) baseQuery.set("agrupar2", agruparFields[1]);
  baseQuery.set("pageSize", String(pageSize));

  const extraFilterCount = [estado, zona, provincia, municipio].filter(Boolean).length + agruparFields.length;
  const hasExtraFilters = extraFilterCount > 0;

  // Chips summarizing active filters/grouping, each removable on its own —
  // built from the full current query (not baseQuery) so removing one chip
  // preserves everything else (vista, sort...) except pagination position,
  // since the result set shifts once a filter changes.
  const currentQuery = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) currentQuery.set(k, v);
  }
  function chipHref(...remove: string[]): string {
    const p = new URLSearchParams(currentQuery);
    remove.forEach((k) => p.delete(k));
    p.delete("page");
    return `/empresas?${p.toString()}`;
  }
  const chips: { label: string; href: string }[] = [];
  if (provincia) chips.push({ label: `Provincia: ${provincia}`, href: chipHref("provincia") });
  if (municipio) chips.push({ label: `Ciudad: ${municipio}`, href: chipHref("municipio") });
  if (estado) chips.push({ label: `Estado: ${estado}`, href: chipHref("estado") });
  if (zona) chips.push({ label: `Zona: ${zona}`, href: chipHref("zona") });
  if (agruparFields.length > 0) {
    const labels = agruparFields.map((f) => GROUPABLE_FIELDS.find((g) => g.key === f)!.label);
    chips.push({ label: `Agrupar: ${labels.join(" > ")}`, href: chipHref("agrupar1", "agrupar2") });
  }

  const listaQuery = new URLSearchParams(baseQuery);
  listaQuery.delete("vista");
  const kanbanQuery = new URLSearchParams(baseQuery);
  kanbanQuery.set("vista", "kanban");

  const exportQuery = new URLSearchParams(baseQuery);
  exportQuery.delete("pageSize");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Empresas</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">
              {vista === "lista" && !grouped && sortedCompanies.length > 0
                ? `Mostrando ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, sortedCompanies.length)} de ${sortedCompanies.length} resultado(s)`
                : `${sortedCompanies.length} resultado(s)`}
            </p>
            {vista === "lista" && !grouped && sortedCompanies.length > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-slate-400">Mostrar:</span>
                {PAGE_SIZES.map((size) => {
                  const sizeQuery = new URLSearchParams(baseQuery);
                  sizeQuery.set("pageSize", String(size));
                  sizeQuery.set("page", "1");
                  return (
                    <Link
                      key={size}
                      href={`/empresas?${sizeQuery.toString()}`}
                      className={`rounded-md px-2 py-0.5 ${
                        pageSize === size ? "bg-slate-900 text-white" : "border border-slate-300 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {size}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-300 p-0.5 text-sm">
            <Link
              href={`/empresas?${listaQuery.toString()}`}
              className={`px-3 py-1.5 rounded-md ${vista === "lista" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Lista
            </Link>
            <Link
              href={`/empresas?${kanbanQuery.toString()}`}
              className={`px-3 py-1.5 rounded-md ${vista === "kanban" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Kanban
            </Link>
          </div>
          <Link
            href="/empresas/mapa"
            title="Ver mapa"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 text-sm px-3 py-2 hover:bg-slate-50"
          >
            <MapIcon />
            <span className="hidden sm:inline">Ver mapa</span>
          </Link>
          <a
            href={`/empresas/export?${exportQuery.toString()}`}
            title="Exportar CSV"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 text-sm px-3 py-2 hover:bg-slate-50"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Exportar</span>
          </a>
          <Link
            href="/empresas/importar"
            title="Importar Excel/CSV"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 text-sm px-3 py-2 hover:bg-slate-50"
          >
            <UploadIcon />
            <span className="hidden sm:inline">Importar</span>
          </Link>
          <Link
            href="/empresas/nueva"
            title="Nueva empresa"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-sm px-3 py-2 hover:bg-blue-700"
          >
            <PlusIcon />
            <span className="hidden sm:inline">Nueva empresa</span>
          </Link>
        </div>
      </div>

      <form className="flex flex-col gap-3" action="/empresas" method="get">
        {vista === "kanban" && <input type="hidden" name="vista" value="kanban" />}
        {pageSize !== DEFAULT_PAGE_SIZE && <input type="hidden" name="pageSize" value={pageSize} />}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por empresa, municipio, email, contacto..."
            className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
            Buscar
          </button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 hover:bg-blue-100"
              >
                {chip.label}
                <span aria-hidden="true">×</span>
              </Link>
            ))}
          </div>
        )}

        <details open={hasExtraFilters} className="text-sm">
          <summary className="cursor-pointer text-slate-600 hover:text-blue-600 inline-flex items-center gap-1.5 list-none">
            <FilterIcon className="h-4 w-4" />
            Filtros
            {extraFilterCount > 0 && (
              <span className="rounded-full bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5">{extraFilterCount}</span>
            )}
          </summary>
          <div className="grid sm:grid-cols-2 gap-6 mt-3 p-4 rounded-lg border border-slate-200 bg-slate-50/60">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filtros</span>
              <select name="provincia" defaultValue={provincia} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Todas las provincias</option>
                {provincias.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select name="municipio" defaultValue={municipio} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Todas las ciudades</option>
                {municipios.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select name="estado" defaultValue={estado} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Todos los estados</option>
                {estados.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <select name="zona" defaultValue={zona} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Todas las zonas</option>
                {ZONAS.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Agrupar por</span>
              <select name="agrupar1" defaultValue={agruparFields[0] ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Sin agrupar</option>
                {GROUPABLE_FIELDS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
              <select name="agrupar2" defaultValue={agruparFields[1] ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">(sin segundo nivel)</option>
                {GROUPABLE_FIELDS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                Al agrupar, la lista se muestra como árbol plegable y se desactiva la paginación.
              </p>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
                Aplicar
              </button>
              {(q || hasExtraFilters) && (
                <Link href="/empresas" className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:underline">
                  Limpiar todo
                </Link>
              )}
            </div>
          </div>
        </details>
      </form>

      {vista === "kanban" ? (
        <EmpresasKanban companies={sortedCompanies} estados={estados} estadoColors={estadoColors} />
      ) : grouped ? (
        <EmpresasGroupedTree groups={groups} estadoColors={estadoColors} />
      ) : (
        <div className="flex flex-col gap-3">
          <EmpresasTable
            companies={pageCompanies}
            sort={sort}
            dir={dir}
            baseQuery={baseQuery.toString()}
            timezone={settings.timezone}
            tagColors={tagColors}
            estadoColors={estadoColors}
          />
          <Pagination page={page} totalPages={totalPages} baseQuery={baseQuery.toString()} />
        </div>
      )}
    </div>
  );
}
