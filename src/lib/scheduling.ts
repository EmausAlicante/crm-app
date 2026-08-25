import { distanceKm } from "./distance";
import type { Company } from "./types";

// Conservative mixed urban/interurban estimate — we don't have a routing API
// (Google Directions etc.), so this is a straight-line-distance approximation,
// good enough for laying out a plausible day, not turn-by-turn accurate.
const AVG_SPEED_KMH = 30;
// A real commercial visit rarely wraps up in under an hour once you count
// small talk, a tour, actually talking business — and there's always at
// least ~15 min of driving/parking/walking-in even between "next door" stops.
const VISIT_MINUTES = 60;
const MIN_TRAVEL_MINUTES = 15;

// Spanish SMEs very commonly run a split day ("horario partido") with a
// lunch closure — scheduling straight through 14:00-16:00 produces plans
// nobody could actually keep. Confirmed appointments still override this
// (if the company told you 14:30, you go at 14:30), but estimated stops only
// get placed inside these windows.
const WORK_WINDOWS: { start: number; end: number; afternoon: boolean }[] = [
  { start: 9 * 60, end: 14 * 60, afternoon: false }, // 09:00-14:00
  { start: 16 * 60, end: 19 * 60, afternoon: true }, // 16:00-19:00
];

export type ScheduledStop = {
  company: Company;
  distanciaKm: number | null;
  horaEstimada: string; // "HH:MM"
  confirmada: boolean;
};

function travelMinutes(km: number | null): number {
  if (km == null) return MIN_TRAVEL_MINUTES;
  return Math.max(MIN_TRAVEL_MINUTES, Math.round((km / AVG_SPEED_KMH) * 60));
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Pure UTC date-component arithmetic — avoids the classic bug where
// constructing a local-midnight Date and reading it back via toISOString()
// shifts by a day for any timezone ahead of UTC (e.g. Spain).
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

type Loc = { lat: number; lon: number };

function jornadaBlocks(c: Company, afternoon: boolean): boolean {
  if (c.jornada === "solo_manana" && afternoon) return true;
  if (c.jornada === "solo_tarde" && !afternoon) return true;
  return false;
}

// Builds one day's stop-by-stop plan across the morning/afternoon work
// windows. Confirmed appointments (company has proximaVisita === date and
// proximaVisitaHora set) are placed at their fixed time regardless of window;
// the time around them is filled with the best-scoring nearby candidates
// that haven't been used on another day yet and whose jornada (mañana/tarde)
// doesn't rule out that slot.
export function buildDaySchedule(
  candidates: (Company & { distanciaKm: number | null })[],
  confirmedForDate: Company[],
  used: Set<number>
): { stops: ScheduledStop[]; usedIds: number[] } {
  const confirmedIds = new Set(confirmedForDate.map((c) => c.id));
  const pool = candidates.filter((c) => !used.has(c.id) && !confirmedIds.has(c.id));
  const stops: ScheduledStop[] = [];
  const usedIds: number[] = [];
  const placedConfirmedIds = new Set<number>();

  const confirmedSorted = [...confirmedForDate]
    .filter((c) => c.proximaVisitaHora)
    .sort((a, b) => (a.proximaVisitaHora ?? "").localeCompare(b.proximaVisitaHora ?? ""));

  let lastLoc: Loc | null = null;

  function nearestUnused(reference: Loc | null, afternoon: boolean): (Company & { distanciaKm: number | null }) | null {
    const eligible = pool.filter((c) => !jornadaBlocks(c, afternoon));
    if (eligible.length === 0) return null;
    if (!reference) return eligible[0]; // already score-sorted from the caller
    let best = eligible[0];
    let bestDist =
      best.latitud != null && best.longitud != null ? distanceKm(reference.lat, reference.lon, best.latitud, best.longitud) : Infinity;
    for (const c of eligible.slice(1)) {
      const scoreDiff = (c.valoracion ?? -1) - (best.valoracion ?? -1);
      const d = c.latitud != null && c.longitud != null ? distanceKm(reference.lat, reference.lon, c.latitud, c.longitud) : Infinity;
      if (scoreDiff > 0 || (scoreDiff === 0 && d < bestDist)) {
        best = c;
        bestDist = d;
      }
    }
    return best;
  }

  function placeConfirmed(conf: Company, clock: number): number {
    const confMinutes = hhmmToMinutes(conf.proximaVisitaHora!);
    const confLoc: Loc | null = conf.latitud != null && conf.longitud != null ? { lat: conf.latitud, lon: conf.longitud } : null;
    const distFromLast = lastLoc && confLoc ? distanceKm(lastLoc.lat, lastLoc.lon, confLoc.lat, confLoc.lon) : null;
    stops.push({ company: conf, distanciaKm: distFromLast, horaEstimada: conf.proximaVisitaHora!.slice(0, 5), confirmada: true });
    usedIds.push(conf.id);
    placedConfirmedIds.add(conf.id);
    if (confLoc) lastLoc = confLoc;
    return Math.max(confMinutes, clock) + VISIT_MINUTES;
  }

  for (const window of WORK_WINDOWS) {
    let clock = window.start;
    const windowConfirmed = confirmedSorted.filter((c) => {
      const t = hhmmToMinutes(c.proximaVisitaHora!);
      return t >= window.start && t < window.end;
    });

    function placeCandidate(c: Company & { distanciaKm: number | null }, budgetEnd: number): boolean {
      const distFromLast = lastLoc && c.latitud != null && c.longitud != null ? distanceKm(lastLoc.lat, lastLoc.lon, c.latitud, c.longitud) : null;
      const arrival = clock + travelMinutes(distFromLast);
      if (arrival + VISIT_MINUTES > budgetEnd) return false;
      stops.push({ company: c, distanciaKm: distFromLast ?? c.distanciaKm, horaEstimada: minutesToHHMM(arrival), confirmada: false });
      usedIds.push(c.id);
      pool.splice(pool.indexOf(c), 1);
      clock = arrival + VISIT_MINUTES;
      if (c.latitud != null && c.longitud != null) lastLoc = { lat: c.latitud, lon: c.longitud };
      return true;
    }

    for (const conf of windowConfirmed) {
      const confMinutes = hhmmToMinutes(conf.proximaVisitaHora!);
      const confLoc: Loc | null = conf.latitud != null && conf.longitud != null ? { lat: conf.latitud, lon: conf.longitud } : null;
      // Fill the gap before this confirmed stop, biased toward its location.
      while (true) {
        const next = nearestUnused(confLoc ?? lastLoc, window.afternoon);
        if (!next || !placeCandidate(next, confMinutes)) break;
      }
      clock = placeConfirmed(conf, clock);
    }

    // Fill whatever's left of this window.
    while (true) {
      const next = nearestUnused(lastLoc, window.afternoon);
      if (!next || !placeCandidate(next, window.end)) break;
    }
  }

  // Any confirmed appointment whose time fell outside both work windows
  // (e.g. a very early/late or lunchtime confirmation) still has to be
  // honored — place any leftovers in chronological order at the end.
  const leftoverConfirmed = confirmedSorted.filter((c) => !placedConfirmedIds.has(c.id));
  for (const conf of leftoverConfirmed) {
    const confLoc: Loc | null = conf.latitud != null && conf.longitud != null ? { lat: conf.latitud, lon: conf.longitud } : null;
    const distFromLast = lastLoc && confLoc ? distanceKm(lastLoc.lat, lastLoc.lon, confLoc.lat, confLoc.lon) : null;
    stops.push({ company: conf, distanciaKm: distFromLast, horaEstimada: conf.proximaVisitaHora!.slice(0, 5), confirmada: true });
    usedIds.push(conf.id);
    if (confLoc) lastLoc = confLoc;
  }
  stops.sort((a, b) => a.horaEstimada.localeCompare(b.horaEstimada));

  return { stops, usedIds };
}
