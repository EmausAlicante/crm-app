import Link from "next/link";
import { listCompanies, listDistinctProvincias } from "@/lib/companies";
import { starRating, ZONAS, VISITAS_POR_DIA } from "@/lib/constants";
import { listRutaDias } from "@/lib/rutaDias";
import { buildGoogleMapsUrl } from "@/lib/maps";
import { geocodeAddress } from "@/lib/geocode";
import { distanceKm } from "@/lib/distance";
import { addDays, buildDaySchedule, type ScheduledStop } from "@/lib/scheduling";
import type { Company } from "@/lib/types";
import RatingBadge from "../empresas/RatingBadge";
import LeadsMapClient from "../empresas/mapa/LeadsMapClient";
import type { MapCompany } from "../empresas/mapa/LeadsMap";
import DiaScheduleBlock from "./DiaScheduleBlock";

export const dynamic = "force-dynamic";

const MADRID_CENTER: [number, number] = [40.4168, -3.7038];
const MAX_DIAS_VIAJE = 10;
// "De paso" radius: how far from the target company we still suggest a detour.
const RADIO_CERCANIA_KM = 20;

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

// Score first; within the same score, prioritize companies that are close to
// each other (distance to the group's own centroid) so a day's plan isn't a
// zigzag across the whole zone just because scores happened to line up that way.
function sortByScoreAndProximity(list: Company[]): (Company & { distanciaKm: number | null })[] {
  const conCoords = list.filter((c) => c.latitud != null && c.longitud != null);
  const centro =
    conCoords.length > 0
      ? {
          lat: conCoords.reduce((s, c) => s + (c.latitud as number), 0) / conCoords.length,
          lon: conCoords.reduce((s, c) => s + (c.longitud as number), 0) / conCoords.length,
        }
      : null;
  return list
    .map((c) => ({
      ...c,
      distanciaKm:
        centro && c.latitud != null && c.longitud != null ? distanceKm(centro.lat, centro.lon, c.latitud, c.longitud) : null,
    }))
    .sort((a, b) => {
      const scoreDiff = (b.valoracion ?? -1) - (a.valoracion ?? -1);
      if (scoreDiff !== 0) return scoreDiff;
      if (a.distanciaKm == null && b.distanciaKm == null) return 0;
      if (a.distanciaKm == null) return 1;
      if (b.distanciaKm == null) return -1;
      return a.distanciaKm - b.distanciaKm;
    });
}

function mapCenter(mapCompanies: MapCompany[]): [number, number] {
  if (mapCompanies.length === 0) return MADRID_CENTER;
  return [
    mapCompanies.reduce((s, c) => s + c.latitud, 0) / mapCompanies.length,
    mapCompanies.reduce((s, c) => s + c.longitud, 0) / mapCompanies.length,
  ];
}

function parseMulti(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) return [v];
  return [];
}

function fechaLabel(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function RouteCompanyRow({ c, label }: { c: Company & { distanciaKm?: number | null }; label?: string }) {
  return (
    <li>
      <Link
        href={`/empresas/${c.id}`}
        className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 hover:border-blue-200 hover:bg-blue-50/40"
      >
        <div>
          <div className="text-sm font-medium text-slate-800">
            {c.empresa}
            {label && <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-500">{label}</span>}
          </div>
          <div className="text-xs text-slate-500">
            {c.municipio}
            {c.direccion ? ` · ${c.direccion}` : ""}
            {c.distanciaKm != null && c.distanciaKm > 0 ? ` · ${c.distanciaKm.toFixed(1)} km` : ""}
          </div>
          <div className="mt-1">
            <RatingBadge valoracion={c.valoracion} />
          </div>
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">{c.estado}</span>
      </Link>
    </li>
  );
}


function buildSchedule(
  pool: (Company & { distanciaKm: number | null })[],
  candidates: Company[],
  diasViaje: number,
  fechaInicio: string
): { dias: { date: string | null; stops: ScheduledStop[] }[]; reserva: (Company & { distanciaKm: number | null })[] } {
  const used = new Set<number>();
  const dias: { date: string | null; stops: ScheduledStop[] }[] = [];
  for (let i = 0; i < diasViaje; i++) {
    const date = fechaInicio ? addDays(fechaInicio, i) : null;
    const confirmedForDate = date ? candidates.filter((c) => c.proximaVisita === date && c.proximaVisitaHora) : [];
    const { stops, usedIds } = buildDaySchedule(pool, confirmedForDate, used);
    usedIds.forEach((id) => used.add(id));
    dias.push({ date, stops });
  }
  const reserva = pool.filter((c) => !used.has(c.id));
  return { dias, reserva };
}

export default async function RutasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const provinciasViaje = parseMulti(sp.provincia);
  const zonasViaje = parseMulti(sp.zona);
  const fechaInicioViaje = typeof sp.fechaInicio === "string" ? sp.fechaInicio : "";
  const origenViaje = typeof sp.origen === "string" ? sp.origen.trim() : "";
  const diasViajeRaw = typeof sp.dias === "string" ? parseInt(sp.dias, 10) : 1;
  const diasViaje = Number.isFinite(diasViajeRaw) ? Math.min(Math.max(diasViajeRaw, 1), MAX_DIAS_VIAJE) : 1;
  const empresaIdRaw = typeof sp.empresaId === "string" ? parseInt(sp.empresaId, 10) : null;
  const empresaIdsRaw = typeof sp.empresaIds === "string" ? sp.empresaIds : "";
  const empresaIdsList = empresaIdsRaw
    ? empresaIdsRaw
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n))
    : [];
  const generar = sp.generar === "1";

  const [companies, rutaDias, provincias] = await Promise.all([listCompanies(), listRutaDias(), listDistinctProvincias()]);

  const empresaDestino = empresaIdRaw ? (companies.find((c) => c.id === empresaIdRaw) ?? null) : null;

  // "Área" mode: filter by provincia and/or zona, sort by score+proximity,
  // then lay out day by day — confirmed appointments (empresa con próxima
  // visita + hora en ese día) anchor the schedule, and the time around them
  // fills in with the best nearby candidates, including ones "de paso" that
  // weren't originally the top picks.
  const areaPoolBase =
    generar && !empresaDestino && empresaIdsList.length === 0
      ? companies.filter(
          (c) =>
            (provinciasViaje.length === 0 || (c.provincia != null && provinciasViaje.includes(c.provincia))) &&
            (zonasViaje.length === 0 || (c.zonaRuta != null && zonasViaje.includes(c.zonaRuta))) &&
            c.estado !== "Descartado"
        )
      : [];
  const areaCandidates = sortByScoreAndProximity(areaPoolBase);
  const { dias: viajeDiasSchedule, reserva: viajeReserva } =
    areaCandidates.length > 0 ? buildSchedule(areaCandidates, areaPoolBase, diasViaje, fechaInicioViaje) : { dias: [], reserva: [] };

  let origenCoords: { lat: number; lon: number } | null = null;
  let origenNoEncontrado = false;
  if (generar && !empresaDestino && empresaIdsList.length === 0 && origenViaje) {
    origenCoords = await geocodeAddress(`${origenViaje}, España`);
    if (!origenCoords) origenNoEncontrado = true;
  }

  // "Tengo que ir a una empresa" mode: pin that company as the mandatory stop
  // and suggest nearby ones (any zone) to visit on the way, best score first.
  let destinoCoords: { lat: number; lon: number } | null = null;
  let destinoSinUbicacion = false;
  let cercanas: (Company & { distanciaKm: number | null })[] = [];
  if (generar && empresaDestino) {
    if (empresaDestino.latitud != null && empresaDestino.longitud != null) {
      destinoCoords = { lat: empresaDestino.latitud, lon: empresaDestino.longitud };
    } else {
      const direccion = [empresaDestino.direccion, empresaDestino.municipio, empresaDestino.provincia, "España"]
        .filter(Boolean)
        .join(", ");
      destinoCoords = direccion ? await geocodeAddress(direccion) : null;
    }
    if (!destinoCoords) {
      destinoSinUbicacion = true;
    } else {
      cercanas = companies
        .filter((c) => c.id !== empresaDestino.id && c.estado !== "Descartado" && c.latitud != null && c.longitud != null)
        .map((c) => ({ ...c, distanciaKm: distanceKm(destinoCoords!.lat, destinoCoords!.lon, c.latitud as number, c.longitud as number) }))
        .filter((c) => (c.distanciaKm as number) <= RADIO_CERCANIA_KM)
        .sort((a, b) => {
          const scoreDiff = (b.valoracion ?? -1) - (a.valoracion ?? -1);
          if (scoreDiff !== 0) return scoreDiff;
          return (a.distanciaKm as number) - (b.distanciaKm as number);
        });
    }
  }
  const rutaDestino = empresaDestino ? [{ ...empresaDestino, distanciaKm: 0 }, ...cercanas.slice(0, VISITAS_POR_DIA - 1)] : [];
  const rutaDestinoReserva = empresaDestino ? cercanas.slice(VISITAS_POR_DIA - 1) : [];

  // "Yo elijo las empresas" mode: same scheduling engine, but the candidate
  // pool is exactly the companies picked from the Empresas list.
  const seleccionPoolBase =
    generar && !empresaDestino && empresaIdsList.length > 0 ? companies.filter((c) => empresaIdsList.includes(c.id)) : [];
  const seleccionCandidates = sortByScoreAndProximity(seleccionPoolBase);
  const { dias: seleccionDiasSchedule, reserva: seleccionReserva } =
    seleccionCandidates.length > 0
      ? buildSchedule(seleccionCandidates, seleccionPoolBase, diasViaje, fechaInicioViaje)
      : { dias: [], reserva: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Rutas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Plan semanal recurrente, una ruta puntual para un viaje, o elige tú mismo las empresas desde{" "}
          <Link href="/empresas" className="text-blue-600 hover:underline">
            Empresas
          </Link>
          .
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-medium text-slate-800">Generador de ruta (viaje)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Elige una o varias provincias (y/o zonas), cuántos días vas a estar y, si quieres, la fecha de inicio.
            Ordena primero por puntuación y cercanía; si alguna empresa tiene &quot;Próxima visita&quot; con fecha y hora
            dentro de esos días, se respeta como cita fija y el resto se encaja alrededor — incluyendo empresas
            cercanas que no habías marcado pero que caen de paso. Los horarios marcados con{" "}
            <span className="text-slate-400 font-medium">~</span> son una estimación aproximada (línea recta a
            velocidad media, sin tráfico ni carreteras reales) — los marcados con 🔒 son citas ya confirmadas.
          </p>
        </div>
        <form className="grid sm:grid-cols-4 gap-3 text-sm items-end">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-slate-600">Provincia (marca una o varias)</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-300 px-3 py-2 max-h-24 overflow-y-auto">
              {provincias.map((p) => (
                <label key={p} className="flex items-center gap-1.5">
                  <input type="checkbox" name="provincia" value={p} defaultChecked={provinciasViaje.includes(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-slate-600">Zona de Madrid (marca una o varias, opcional)</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-300 px-3 py-2 max-h-24 overflow-y-auto">
              {ZONAS.map((z) => (
                <label key={z} className="flex items-center gap-1.5">
                  <input type="checkbox" name="zona" value={z} defaultChecked={zonasViaje.includes(z)} />
                  {z}
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Fecha de inicio (opcional)</span>
            <input name="fechaInicio" type="date" defaultValue={fechaInicioViaje} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Días que vas a estar</span>
            <input
              name="dias"
              type="number"
              min={1}
              max={MAX_DIAS_VIAJE}
              defaultValue={diasViaje}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-slate-600">Punto de partida (hotel, oficina...)</span>
            <input
              name="origen"
              defaultValue={origenViaje}
              placeholder="Ej: Hotel Ibis Las Rozas"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-slate-600">
              O bien: ya sé a qué empresa tengo que ir hoy (ignora lo anterior y busca cercanas alrededor)
            </span>
            <select name="empresaId" defaultValue={empresaIdRaw ?? ""} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">— Ninguna, usar provincia/zona —</option>
              {companies
                .slice()
                .sort((a, b) => a.empresa.localeCompare(b.empresa))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.empresa} ({c.municipio ?? "sin municipio"})
                  </option>
                ))}
            </select>
          </label>
          <input type="hidden" name="generar" value="1" />
          <button type="submit" className="sm:col-span-4 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700">
            Generar ruta
          </button>
        </form>

        {origenNoEncontrado && (
          <p className="text-sm text-amber-600">
            No se ha podido localizar &quot;{origenViaje}&quot;. Se ha ordenado solo por puntuación, sin tener en cuenta la
            cercanía.
          </p>
        )}
        {destinoSinUbicacion && (
          <p className="text-sm text-amber-600">
            {empresaDestino?.empresa} no tiene ubicación conocida ni una dirección que se pueda localizar, así que no
            se pueden calcular empresas cercanas. Geocodifícala desde el{" "}
            <Link href="/empresas/mapa" className="underline">
              mapa de leads
            </Link>
            .
          </p>
        )}

        {generar && empresaDestino && !destinoSinUbicacion && (
          <div className="rounded-lg border border-slate-100 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="font-medium text-sm">
                Ruta de hoy <span className="text-slate-400 font-normal">· {rutaDestino.length} visita(s)</span>
              </h3>
              {(() => {
                const mapsUrl = buildGoogleMapsUrl(rutaDestino, origenViaje || null);
                return (
                  mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 whitespace-nowrap"
                    >
                      Abrir ruta en Google Maps →
                    </a>
                  )
                );
              })()}
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <ul className="flex flex-col gap-2">
                {rutaDestino.map((c, i) => (
                  <RouteCompanyRow key={c.id} c={c} label={i === 0 ? "Objetivo" : "De paso"} />
                ))}
              </ul>
              {(() => {
                const mapCompanies = toMapCompanies(rutaDestino);
                return mapCompanies.length > 0 ? (
                  <LeadsMapClient companies={mapCompanies} center={mapCenter(mapCompanies)} height="240px" zoom={11} />
                ) : null;
              })()}
            </div>
            {rutaDestinoReserva.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-slate-500 hover:underline">
                  + {rutaDestinoReserva.length} más cerca (a menos de {RADIO_CERCANIA_KM} km, no caben hoy)
                </summary>
                <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                  {rutaDestinoReserva.map((c) => (
                    <RouteCompanyRow key={c.id} c={c} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {generar && !empresaDestino && empresaIdsList.length === 0 && areaCandidates.length === 0 && (
          <p className="text-sm text-slate-400">
            No hay empresas pendientes{provinciasViaje.length > 0 ? ` en ${provinciasViaje.join(", ")}` : ""}
            {zonasViaje.length > 0 ? ` (${zonasViaje.join(", ")})` : ""}.
          </p>
        )}

        {generar && !empresaDestino && empresaIdsList.length === 0 && areaCandidates.length > 0 && (
          <div className="flex flex-col gap-4">
            {viajeDiasSchedule.map((d, i) => (
              <DiaScheduleBlock key={i} index={i} dateLabel={fechaLabel(d.date)} stops={d.stops} origen={origenCoords ? origenViaje : null} />
            ))}

            {viajeReserva.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-500 hover:underline">
                  + {viajeReserva.length} más (no caben en los días indicados)
                </summary>
                <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                  {viajeReserva.map((c) => (
                    <RouteCompanyRow key={c.id} c={c} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      {generar && empresaIdsList.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-medium text-slate-800">Ruta con tu selección</h2>
            <p className="text-xs text-slate-500 mt-1">
              {empresaIdsList.length} empresa(s) elegidas desde el listado de Empresas. Ordenadas primero por
              puntuación y cercanía; las citas confirmadas (fecha + hora en &quot;Próxima visita&quot;) se respetan como fijas.
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-3 text-sm">
            <input type="hidden" name="empresaIds" value={empresaIdsRaw} />
            <input type="hidden" name="generar" value="1" />
            <label className="flex flex-col gap-1">
              <span className="text-slate-600">Fecha de inicio (opcional)</span>
              <input name="fechaInicio" type="date" defaultValue={fechaInicioViaje} className="rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-600">Días</span>
              <input
                name="dias"
                type="number"
                min={1}
                max={MAX_DIAS_VIAJE}
                defaultValue={diasViaje}
                className="rounded-lg border border-slate-300 px-3 py-2 w-24"
              />
            </label>
            <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <span className="text-slate-600">Punto de partida (opcional)</span>
              <input
                name="origen"
                defaultValue={origenViaje}
                placeholder="Ej: Hotel Ibis Las Rozas"
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700">
              Actualizar
            </button>
          </form>

          <div className="flex flex-col gap-4">
            {seleccionDiasSchedule.map((d, i) => (
              <DiaScheduleBlock key={i} index={i} dateLabel={fechaLabel(d.date)} stops={d.stops} origen={origenViaje || null} />
            ))}

            {seleccionReserva.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-500 hover:underline">
                  + {seleccionReserva.length} más de tu selección (no caben en los días indicados)
                </summary>
                <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                  {seleccionReserva.map((c) => (
                    <RouteCompanyRow key={c.id} c={c} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        </section>
      )}

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer select-none p-5 font-medium text-slate-700 hover:text-blue-600">
          Rutas semanales (plan fijo, Madrid) — click para ver
          <span className="block text-xs font-normal text-slate-400 mt-1">
            Herramienta antigua, independiente del generador de arriba: reparte hasta {VISITAS_POR_DIA} visitas por
            día fijo de la semana dentro de cada zona de Madrid, sin horarios ni citas confirmadas.
          </span>
        </summary>

        <div className="flex flex-col gap-4 px-5 pb-5">
          {rutaDias.map(({ dia, zona, notas }) => {
          const zoneCompanies = zona
            ? sortByScoreAndProximity(companies.filter((c) => c.zonaRuta === zona && c.estado !== "Descartado"))
            : [];
          const plan = zoneCompanies.slice(0, VISITAS_POR_DIA);
          const reserva = zoneCompanies.slice(VISITAS_POR_DIA);
          const mapsUrl = buildGoogleMapsUrl(plan);
          const planMapCompanies = toMapCompanies(plan);
          return (
            <section key={dia} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-medium">
                    {dia} {zona && <span className="text-slate-400 font-normal">· {zona}</span>}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{notas}</p>
                </div>
                <div className="flex items-center gap-3">
                  {zona && <div className="text-sm text-slate-500">{plan.length} visita(s) hoy</div>}
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
              </div>

              {plan.length > 0 && (
                <div className="mt-4 grid lg:grid-cols-2 gap-4">
                  <ul className="flex flex-col gap-2">
                    {plan.map((c) => (
                      <RouteCompanyRow key={c.id} c={c} />
                    ))}
                  </ul>
                  {planMapCompanies.length > 0 ? (
                    <LeadsMapClient companies={planMapCompanies} center={mapCenter(planMapCompanies)} height="280px" zoom={11} />
                  ) : (
                    <div className="h-[280px] rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-center text-xs text-slate-400 px-4">
                      Ninguna empresa de este día tiene ubicación todavía. Geocodifícalas desde el{" "}
                      <Link href="/empresas/mapa" className="text-blue-600 hover:underline">
                        mapa de leads
                      </Link>
                      .
                    </div>
                  )}
                </div>
              )}

              {reserva.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-slate-500 hover:underline">
                    + {reserva.length} más en esta zona (reserva, no incluidas en el plan de hoy)
                  </summary>
                  <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                    {reserva.map((c) => (
                      <RouteCompanyRow key={c.id} c={c} />
                    ))}
                  </ul>
                </details>
              )}
            </section>
          );
          })}
        </div>
      </details>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium mb-3">Prioridad sugerida (mayor encaje, sin visitar)</h2>
        <PriorityList companies={companies} />
      </section>
    </div>
  );
}

function PriorityList({ companies }: { companies: Company[] }) {
  const candidates = companies
    .filter((c) => c.estado === "Pendiente" && c.valoracion !== null)
    .sort((a, b) => (b.valoracion ?? 0) - (a.valoracion ?? 0))
    .slice(0, 15);

  if (candidates.length === 0) {
    return <p className="text-sm text-slate-400">No hay empresas puntuadas pendientes todavía.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-slate-100">
      {candidates.map((c) => (
        <li key={c.id} className="py-2 flex items-center justify-between gap-3">
          <Link href={`/empresas/${c.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600">
            {c.empresa}
          </Link>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{c.zonaRuta ?? "—"}</span>
            <RatingBadge valoracion={c.valoracion} />
          </div>
        </li>
      ))}
    </ul>
  );
}
