"use client";

import { useState } from "react";
import Link from "next/link";
import { starRating } from "@/lib/constants";
import { buildGoogleMapsUrl } from "@/lib/maps";
import type { Company } from "@/lib/types";
import type { ScheduledStop } from "@/lib/scheduling";
import RatingBadge from "../empresas/RatingBadge";
import LeadsMapClient from "../empresas/mapa/LeadsMapClient";
import type { MapCompany } from "../empresas/mapa/LeadsMap";

const MADRID_CENTER: [number, number] = [40.4168, -3.7038];

function toMapCompanies(companies: Company[]): MapCompany[] {
  return companies
    .filter((c) => c.latitud != null && c.longitud != null)
    .map((c) => ({
      id: c.id,
      empresa: c.empresa,
      latitud: c.latitud as number,
      longitud: c.longitud as number,
      score: c.valoracion,
      rating: starRating(c.valoracion),
    }));
}

function mapCenter(mapCompanies: MapCompany[]): [number, number] {
  if (mapCompanies.length === 0) return MADRID_CENTER;
  return [
    mapCompanies.reduce((s, c) => s + c.latitud, 0) / mapCompanies.length,
    mapCompanies.reduce((s, c) => s + c.longitud, 0) / mapCompanies.length,
  ];
}

// Like the read-only row, but with reorder/remove controls sitting next to
// (not inside) the Link, so tapping them doesn't also navigate to the company.
function ScheduledStopRow({
  stop,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
}: {
  stop: ScheduledStop;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const c = stop.company;
  return (
    <li className="flex items-stretch gap-1 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40">
      <Link href={`/empresas/${c.id}`} className="flex items-start gap-3 flex-1 min-w-0 px-3 py-2">
        <div
          className={`text-xs font-medium pt-0.5 w-16 shrink-0 ${stop.confirmada ? "text-emerald-600" : "text-slate-400"}`}
          title={
            stop.confirmada
              ? "Cita confirmada por la empresa"
              : "Estimación aproximada (velocidad media en línea recta, no tiene en cuenta tráfico ni carreteras reales)"
          }
        >
          {stop.confirmada ? `🔒 ${stop.horaEstimada}` : `~${stop.horaEstimada}`}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800">
            {c.empresa}
            {stop.confirmada && (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-600">Confirmada</span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {c.municipio}
            {c.direccion ? ` · ${c.direccion}` : ""}
            {stop.distanciaKm != null ? ` · ${stop.distanciaKm.toFixed(1)} km` : ""}
          </div>
          <div className="mt-1">
            <RatingBadge valoracion={c.valoracion} />
          </div>
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">{c.estado}</span>
      </Link>
      <div className="flex flex-col justify-center gap-0.5 pl-1 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Subir parada"
          title="Subir"
          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400 text-[10px] leading-none px-1"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Bajar parada"
          title="Bajar"
          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400 text-[10px] leading-none px-1"
        >
          ▼
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar de la ruta de hoy"
        title="Quitar de la ruta de hoy"
        className="self-center pr-2 pl-1 text-slate-300 hover:text-red-500 shrink-0"
      >
        ✕
      </button>
    </li>
  );
}

export default function DiaScheduleBlock({
  index,
  dateLabel,
  stops: initialStops,
  origen,
}: {
  index: number;
  dateLabel: string | null;
  stops: ScheduledStop[];
  origen: string | null;
}) {
  const [stops, setStops] = useState(initialStops);
  const [removed, setRemoved] = useState<ScheduledStop[]>([]);

  if (stops.length === 0 && removed.length === 0) return null;

  function moveStop(i: number, dir: -1 | 1) {
    setStops((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function removeStop(i: number) {
    // Read the current stop directly rather than inside the setStops updater —
    // React (Strict Mode in particular) may invoke updater functions twice to
    // verify they're pure, which would double-push into `removed` if the
    // setRemoved call lived inside setStops's callback.
    const gone = stops[i];
    if (!gone) return;
    setStops((prev) => prev.filter((_, idx) => idx !== i));
    setRemoved((prev) => [...prev, gone]);
  }

  function restoreStop(stop: ScheduledStop) {
    setRemoved((prev) => prev.filter((s) => s.company.id !== stop.company.id));
    setStops((prev) => [...prev, stop]);
  }

  const stopCompanies = stops.map((s) => ({ ...s.company, distanciaKm: s.distanciaKm }));
  const mapsUrl = buildGoogleMapsUrl(stopCompanies, origen);
  const mapCompanies = toMapCompanies(stopCompanies);

  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h3 className="font-medium text-sm">
          Día {index + 1} {dateLabel && <span className="text-slate-400 font-normal">· {dateLabel}</span>}{" "}
          <span className="text-slate-400 font-normal">· {stops.length} visita(s)</span>
        </h3>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 whitespace-nowrap"
          >
            Abrir ruta en Google Maps →
          </a>
        )}
      </div>
      {stops.length > 0 && (
        <p className="text-[11px] text-slate-400 mb-2">
          Usa ▲▼ para reordenar o ✕ para quitar una parada — los horarios no se recalculan automáticamente al mover.
        </p>
      )}
      <div className="grid lg:grid-cols-2 gap-4">
        <ul className="flex flex-col gap-2">
          {stops.map((s, i) => (
            <ScheduledStopRow
              key={s.company.id}
              stop={s}
              onMoveUp={() => moveStop(i, -1)}
              onMoveDown={() => moveStop(i, 1)}
              onRemove={() => removeStop(i)}
              isFirst={i === 0}
              isLast={i === stops.length - 1}
            />
          ))}
        </ul>
        {mapCompanies.length > 0 ? (
          <LeadsMapClient companies={mapCompanies} center={mapCenter(mapCompanies)} height="240px" zoom={11} />
        ) : (
          <div className="h-[240px] rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-center text-xs text-slate-400 px-4">
            Ninguna empresa de este día tiene ubicación todavía.
          </div>
        )}
      </div>
      {removed.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-slate-500 hover:underline">
            {removed.length} quitada(s) de hoy — click para volver a añadir
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {removed.map((s) => (
              <li key={s.company.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-1.5">
                <span className="text-slate-600">{s.company.empresa}</span>
                <button type="button" onClick={() => restoreStop(s)} className="text-blue-600 hover:underline shrink-0">
                  Volver a añadir
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
