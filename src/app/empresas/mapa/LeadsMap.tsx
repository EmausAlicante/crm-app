"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

export type MapCompany = {
  id: number;
  empresa: string;
  latitud: number;
  longitud: number;
  score: number | null; // 0-5
  rating: string;
};

function scoreColor(score: number | null): string {
  if (score === null) return "#94a3b8";
  if (score >= 4.5) return "#059669";
  if (score >= 3.5) return "#16a34a";
  if (score >= 2.5) return "#d97706";
  if (score >= 1.5) return "#ea580c";
  return "#dc2626";
}

function makeIcon(score: number | null) {
  if (score === null) {
    return L.divIcon({
      className: "",
      html: `<div style="background:#94a3b8;color:white;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)">?</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }
  const color = scoreColor(score);
  const stars = score.toFixed(1);
  return L.divIcon({
    className: "",
    html: `<div style="background:white;color:#0f172a;border-radius:9999px;padding:3px 10px;display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;border:2px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,0.3);white-space:nowrap"><span style="color:${color}">★</span>${stars}</div>`,
    iconSize: [58, 24],
    iconAnchor: [29, 12],
  });
}

export default function LeadsMap({
  companies,
  center,
  height = "600px",
  zoom = 10,
}: {
  companies: MapCompany[];
  center: [number, number];
  height?: string;
  zoom?: number;
}) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height, width: "100%", borderRadius: "12px" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {companies.map((c) => (
        <Marker key={c.id} position={[c.latitud, c.longitud]} icon={makeIcon(c.score)}>
          <Popup>
            <div className="text-sm flex flex-col gap-1">
              <div className="font-medium">{c.empresa}</div>
              <div className="text-xs text-slate-500">{c.rating || "Sin evaluar"}</div>
              <Link href={`/empresas/${c.id}`} className="text-blue-600 hover:underline text-xs">
                Ver ficha →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
