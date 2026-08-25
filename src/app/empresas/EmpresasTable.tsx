"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildGoogleMapsUrl, MAX_STOPS } from "@/lib/maps";
import { starRating, VISITAS_POR_DIA } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatDate";
import { contrastTextColor, DEFAULT_TAG_COLOR } from "@/lib/color";
import type { Company } from "@/lib/types";
import RatingBadge from "./RatingBadge";
import EstadoBadge from "./EstadoBadge";
import LeadsMapClient from "./mapa/LeadsMapClient";
import type { MapCompany } from "./mapa/LeadsMap";
import { ALL_COLUMN_KEYS, COLUMN_DEFS, DEFAULT_COLUMNS, type ColumnKey, type SortField } from "./columns";
import { deleteCompaniesAction } from "./actions";
import { ResizeHandle, useColumnWidths } from "../useColumnWidths";

const MADRID_CENTER: [number, number] = [40.4168, -3.7038];
const STORAGE_KEY = "crm-empresas-columnas-v1";
const SELECTION_STORAGE_KEY = "crm-empresas-seleccion-v1";

function SortableHeader({
  label,
  field,
  activeSort,
  activeDir,
  baseQuery,
  onResizeStart,
}: {
  label: string;
  field: SortField;
  activeSort: SortField;
  activeDir: "asc" | "desc";
  baseQuery: string;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const isActive = activeSort === field;
  // Priority/score is most useful highest-first on the very first click; text columns read better A→Z first.
  const defaultDir = field === "valoracion" ? "desc" : "asc";
  const nextDir = isActive ? (activeDir === "asc" ? "desc" : "asc") : defaultDir;
  const params = new URLSearchParams(baseQuery);
  params.set("sort", field);
  params.set("dir", nextDir);

  return (
    <th className="relative text-left font-medium px-4 py-2.5 whitespace-nowrap overflow-hidden">
      <Link href={`/empresas?${params.toString()}`} className="inline-flex items-center gap-1 hover:text-slate-700">
        {label}
        {isActive && <span className="text-slate-400">{activeDir === "asc" ? "▲" : "▼"}</span>}
      </Link>
      <ResizeHandle onResizeStart={onResizeStart} />
    </th>
  );
}

function TagBadges({ clasificacion, tagColors }: { clasificacion: string; tagColors: Record<string, string> }) {
  const tags = clasificacion
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tags.length === 0) return <>—</>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, i) => {
        const color = tagColors[tag] ?? DEFAULT_TAG_COLOR;
        return (
          <span
            key={i}
            className="text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap"
            style={{ backgroundColor: color, color: contrastTextColor(color) }}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}

function renderCell(
  c: Company,
  key: ColumnKey,
  timezone: string,
  tagColors: Record<string, string>,
  estadoColors: Record<string, string>
) {
  switch (key) {
    case "updatedAt":
      return formatDateTime(c.updatedAt, timezone);
    case "clasificacion":
      return c.clasificacion ? <TagBadges clasificacion={c.clasificacion} tagColors={tagColors} /> : "—";
    case "municipio":
      return (
        <>
          <div>{c.municipio ?? "—"}</div>
          {c.zonaRuta && <div className="text-xs text-slate-400">{c.zonaRuta}</div>}
        </>
      );
    case "estado":
      return <EstadoBadge estado={c.estado} color={estadoColors[c.estado]} />;
    case "proximaVisita":
      if (!c.proximaVisita) return "—";
      return c.proximaVisitaHora ? `${c.proximaVisita} · ${c.proximaVisitaHora.slice(0, 5)}` : c.proximaVisita;
    case "valoracion":
      return <RatingBadge valoracion={c.valoracion} />;
    case "web":
      return c.web ? (
        <a
          href={/^https?:\/\//i.test(c.web) ? c.web : `https://${c.web}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:underline"
        >
          {c.web}
        </a>
      ) : (
        "—"
      );
    case "email":
      return c.email ? (
        <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">
          {c.email}
        </a>
      ) : (
        "—"
      );
    case "telefono":
      return c.telefono ? (
        <a
          href={`tel:${c.telefono.replace(/\s+/g, "")}`}
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:underline"
        >
          {c.telefono}
        </a>
      ) : (
        "—"
      );
    default:
      return (c[key] as string | null) ?? "—";
  }
}

function ColumnPicker({
  order,
  hidden,
  onToggle,
  onMove,
  onReset,
}: {
  order: ColumnKey[];
  hidden: Set<ColumnKey>;
  onToggle: (key: ColumnKey) => void;
  onMove: (key: ColumnKey, dir: -1 | 1) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-slate-300 text-sm px-3 py-2 hover:bg-slate-50"
      >
        Columnas
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 w-72 rounded-xl border border-slate-200 bg-white shadow-lg p-3 flex flex-col gap-1 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Columnas visibles</span>
              <button type="button" onClick={onReset} className="text-xs text-blue-600 hover:underline">
                Restablecer
              </button>
            </div>
            {order.map((key, idx) => {
              const def = COLUMN_DEFS.find((d) => d.key === key)!;
              return (
                <div key={key} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50 text-sm">
                  <input
                    type="checkbox"
                    checked={!hidden.has(key)}
                    onChange={() => onToggle(key)}
                    aria-label={`Mostrar columna ${def.label}`}
                    className="shrink-0"
                  />
                  <span className="flex-1 text-slate-700 truncate">{def.label}</span>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMove(key, -1)}
                    aria-label={`Subir columna ${def.label}`}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={idx === order.length - 1}
                    onClick={() => onMove(key, 1)}
                    aria-label={`Bajar columna ${def.label}`}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1"
                  >
                    ↓
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function EmpresasTable({
  companies,
  sort,
  dir,
  baseQuery,
  timezone,
  tagColors,
  estadoColors,
}: {
  companies: Company[];
  sort: SortField;
  dir: "asc" | "desc";
  baseQuery: string;
  timezone: string;
  tagColors: Record<string, string>;
  estadoColors: Record<string, string>;
}) {
  const router = useRouter();
  const [deleting, startDeleteTransition] = useTransition();
  const { getWidth, startResize, resetWidths } = useColumnWidths("crm-empresas-anchos-v1", 160);
  // Persisted (not just component state) because pagination/filtering navigates
  // to a new URL, remounting this component — without this, ticking companies
  // to build a route and then paging to see more silently wiped the picks.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectionLoaded, setSelectionLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
      if (raw) setSelected(new Set(JSON.parse(raw) as number[]));
    } catch {
      // malformed/unavailable storage — keep starting empty
    }
    setSelectionLoaded(true);
  }, []);

  useEffect(() => {
    if (!selectionLoaded) return;
    localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(Array.from(selected)));
  }, [selected, selectionLoaded]);

  const [colOrder, setColOrder] = useState<ColumnKey[]>(ALL_COLUMN_KEYS);
  const [colHidden, setColHidden] = useState<Set<ColumnKey>>(
    new Set(ALL_COLUMN_KEYS.filter((k) => !DEFAULT_COLUMNS.includes(k)))
  );
  const [colsLoaded, setColsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { order: ColumnKey[]; hidden: ColumnKey[] };
        const knownOrder = parsed.order.filter((k) => ALL_COLUMN_KEYS.includes(k));
        const missing = ALL_COLUMN_KEYS.filter((k) => !knownOrder.includes(k));
        setColOrder([...knownOrder, ...missing]);
        setColHidden(new Set(parsed.hidden.filter((k) => ALL_COLUMN_KEYS.includes(k))));
      }
    } catch {
      // malformed/unavailable storage — keep the defaults already set
    }
    setColsLoaded(true);
  }, []);

  useEffect(() => {
    if (!colsLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: colOrder, hidden: Array.from(colHidden) }));
  }, [colOrder, colHidden, colsLoaded]);

  const visibleColumns = useMemo(() => colOrder.filter((k) => !colHidden.has(k)), [colOrder, colHidden]);

  function toggleColumn(key: ColumnKey) {
    setColHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function moveColumn(key: ColumnKey, moveDir: -1 | 1) {
    setColOrder((prev) => {
      const idx = prev.indexOf(key);
      const newIdx = idx + moveDir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  function resetColumns() {
    setColOrder(ALL_COLUMN_KEYS);
    setColHidden(new Set(ALL_COLUMN_KEYS.filter((k) => !DEFAULT_COLUMNS.includes(k))));
    resetWidths();
  }

  const selectedCompanies = useMemo(
    () => companies.filter((c) => selected.has(c.id)),
    [companies, selected]
  );
  const mapsUrl = useMemo(() => buildGoogleMapsUrl(selectedCompanies), [selectedCompanies]);
  const rutaHref = useMemo(() => {
    const ids = Array.from(selected).join(",");
    const dias = Math.max(1, Math.ceil(selected.size / VISITAS_POR_DIA));
    return `/rutas?empresaIds=${ids}&dias=${dias}&generar=1`;
  }, [selected]);
  const allVisibleSelected = companies.length > 0 && companies.every((c) => selected.has(c.id));

  const selectedMapCompanies: MapCompany[] = useMemo(
    () =>
      selectedCompanies
        .filter((c) => c.latitud != null && c.longitud != null)
        .map((c) => ({
          id: c.id,
          empresa: c.empresa,
          latitud: c.latitud as number,
          longitud: c.longitud as number,
          score: c.valoracion,
          rating: starRating(c.valoracion),
        })),
    [selectedCompanies]
  );
  const selectedMapCenter: [number, number] = useMemo(() => {
    if (selectedMapCompanies.length === 0) return MADRID_CENTER;
    return [
      selectedMapCompanies.reduce((s, c) => s + c.latitud, 0) / selectedMapCompanies.length,
      selectedMapCompanies.reduce((s, c) => s + c.longitud, 0) / selectedMapCompanies.length,
    ];
  }, [selectedMapCompanies]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    const count = selected.size;
    if (count === 0) return;
    const label = count === 1 ? "esta empresa" : `estas ${count} empresas`;
    if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
    const ids = Array.from(selected);
    startDeleteTransition(async () => {
      await deleteCompaniesAction(ids);
      setSelected(new Set());
      router.refresh();
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      // Only add/remove this page's rows — replacing the whole set would wipe
      // selections made on other pages now that they're persisted across them.
      if (companies.every((c) => next.has(c.id))) {
        companies.forEach((c) => next.delete(c.id));
      } else {
        companies.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-blue-800">
              {selected.size} empresa(s) seleccionada(s)
              {selected.size > MAX_STOPS && ` (se usarán las primeras ${MAX_STOPS} en Google Maps)`}
              {selectedMapCompanies.length < selected.size &&
                ` · ${selected.size - selectedMapCompanies.length} sin ubicación en el mapa`}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(new Set())} className="text-blue-700 hover:underline">
                Quitar selección
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
              >
                {deleting ? "Eliminando…" : "Eliminar seleccionadas"}
              </button>
              <Link
                href={rutaHref}
                className="rounded-lg border border-blue-600 text-blue-700 px-3 py-1.5 hover:bg-blue-100 whitespace-nowrap"
              >
                Generar ruta (día a día) →
              </Link>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700 whitespace-nowrap"
                >
                  Abrir ruta en Google Maps →
                </a>
              )}
            </div>
          </div>
          {selectedMapCompanies.length > 0 && (
            <LeadsMapClient companies={selectedMapCompanies} center={selectedMapCenter} height="320px" zoom={11} />
          )}
        </div>
      )}

      <div className="flex justify-end">
        <ColumnPicker order={colOrder} hidden={colHidden} onToggle={toggleColumn} onMove={moveColumn} onReset={resetColumns} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="table-fixed text-sm">
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: getWidth("empresa") }} />
            {visibleColumns.map((key) => (
              <col key={key} style={{ width: getWidth(key) }} />
            ))}
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todas"
                />
              </th>
              <SortableHeader
                label="Empresa"
                field="empresa"
                activeSort={sort}
                activeDir={dir}
                baseQuery={baseQuery}
                onResizeStart={startResize("empresa")}
              />
              {visibleColumns.map((key) => {
                const def = COLUMN_DEFS.find((d) => d.key === key)!;
                return (
                  <SortableHeader
                    key={key}
                    label={def.label}
                    field={key}
                    activeSort={sort}
                    activeDir={dir}
                    baseQuery={baseQuery}
                    onResizeStart={startResize(key)}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/empresas/${c.id}`)}
                className={`cursor-pointer hover:bg-slate-50 ${selected.has(c.id) ? "bg-blue-50/60" : ""}`}
              >
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    aria-label={`Seleccionar ${c.empresa}`}
                  />
                </td>
                <td className="px-4 py-2.5 overflow-hidden">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="h-7 w-7 rounded object-contain border border-slate-100 shrink-0" />
                    ) : (
                      <div className="h-7 w-7 rounded bg-slate-50 border border-slate-100 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900 hover:text-blue-600 truncate block">{c.empresa}</span>
                      {c.contacto && <div className="text-xs text-slate-500 truncate">{c.contacto}</div>}
                    </div>
                  </div>
                </td>
                {visibleColumns.map((key) => (
                  <td key={key} className="px-4 py-2.5 text-slate-600 whitespace-nowrap overflow-hidden">
                    {renderCell(c, key, timezone, tagColors, estadoColors)}
                  </td>
                ))}
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-4 py-10 text-center text-slate-400">
                  Sin resultados con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
