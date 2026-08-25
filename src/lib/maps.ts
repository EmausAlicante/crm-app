import type { Company } from "./types";

const MAX_STOPS = 10;

export function buildGoogleMapsUrl(companies: Company[], origin?: string | null): string | null {
  const companyStops = companies
    .map((c) => [c.direccion, c.municipio, c.provincia ?? "Madrid"].filter(Boolean).join(", "))
    .filter(Boolean)
    .slice(0, MAX_STOPS);
  const stops = origin ? [origin, ...companyStops] : companyStops;
  if (stops.length === 0 || (origin && companyStops.length === 0)) return null;
  return `https://www.google.com/maps/dir/${stops.map((s) => encodeURIComponent(s)).join("/")}`;
}

export { MAX_STOPS };
