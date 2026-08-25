"use client";

import dynamic from "next/dynamic";
import type { MapCompany } from "./LeadsMap";

// Leaflet touches `window` at import time, which breaks the server-render pass
// Next.js still does for Client Components. Load it only in the browser.
const LeadsMap = dynamic(() => import("./LeadsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
      Cargando mapa…
    </div>
  ),
});

export default function LeadsMapClient({
  companies,
  center,
  height,
  zoom,
}: {
  companies: MapCompany[];
  center: [number, number];
  height?: string;
  zoom?: number;
}) {
  // react-leaflet's MapContainer only reads `center`/`zoom` on the very first
  // render — later prop changes are silently ignored. Since this component
  // gets reused across client-side navigations (e.g. resubmitting the Rutas
  // form with a different zone/selection), the map would keep showing the
  // old area with new markers dropped wherever they fall. Force a clean
  // remount whenever the actual company set (or its center) changes.
  const mapKey = `${center[0].toFixed(5)},${center[1].toFixed(5)}|${companies.map((c) => c.id).join("-")}`;
  return <LeadsMap key={mapKey} companies={companies} center={center} height={height} zoom={zoom} />;
}
