import Link from "next/link";
import { listCompanies } from "@/lib/companies";
import { starRating, ZONAS } from "@/lib/constants";
import type { MapCompany } from "./LeadsMap";
import LeadsMapClient from "./LeadsMapClient";
import GeocodeButton from "./GeocodeButton";

export const dynamic = "force-dynamic";

const MADRID_CENTER: [number, number] = [40.4168, -3.7038];

export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const zona = typeof sp.zona === "string" ? sp.zona : "";

  const companies = await listCompanies({ zonaRuta: zona || undefined });
  const withCoords = companies.filter((c) => c.latitud != null && c.longitud != null);
  const missingCount = companies.length - withCoords.length;

  const mapCompanies: MapCompany[] = withCoords.map((c) => ({
    id: c.id,
    empresa: c.empresa,
    latitud: c.latitud as number,
    longitud: c.longitud as number,
    score: c.valoracion,
    rating: starRating(c.valoracion),
  }));

  const center: [number, number] =
    mapCompanies.length > 0
      ? [
          mapCompanies.reduce((s, c) => s + c.latitud, 0) / mapCompanies.length,
          mapCompanies.reduce((s, c) => s + c.longitud, 0) / mapCompanies.length,
        ]
      : MADRID_CENTER;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mapa de leads</h1>
          <p className="text-sm text-slate-500 mt-1">
            Empresas geolocalizadas, con su puntuación comercial en estrellas (0-5). Verde = alta, rojo = baja,
            gris = sin evaluar.
          </p>
        </div>
        {missingCount > 0 && <GeocodeButton missingCount={missingCount} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/empresas/mapa"
          className={`text-sm rounded-lg px-3 py-1.5 border ${!zona ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:bg-slate-50"}`}
        >
          Todas las zonas
        </Link>
        {ZONAS.map((z) => (
          <Link
            key={z}
            href={`/empresas/mapa?zona=${encodeURIComponent(z)}`}
            className={`text-sm rounded-lg px-3 py-1.5 border ${zona === z ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:bg-slate-50"}`}
          >
            {z}
          </Link>
        ))}
      </div>

      {mapCompanies.length > 0 ? (
        <LeadsMapClient companies={mapCompanies} center={center} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          {missingCount > 0
            ? `Hay ${missingCount} empresa(s) sin coordenadas todavía. Pulsa "Geocodificar" para localizarlas.`
            : "No hay empresas para mostrar con estos filtros."}
        </div>
      )}
    </div>
  );
}
