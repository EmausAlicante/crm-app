"use server";

import { revalidatePath } from "next/cache";
import pool, { schemaReady } from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";

// Each company can now take up to two geocode requests (full address + municipio
// fallback), so this is kept low to stay under the serverless function timeout.
const BATCH_SIZE = 4;

export async function geocodeMissingAction(): Promise<{ processed: number; updated: number }> {
  await schemaReady;
  const { rows } = await pool.query(
    `SELECT id, direccion, municipio, provincia FROM companies
     WHERE latitud IS NULL AND (direccion IS NOT NULL OR municipio IS NOT NULL)
     ORDER BY id ASC LIMIT $1`,
    [BATCH_SIZE]
  );

  let updated = 0;
  for (const c of rows) {
    const query = [c.direccion, c.municipio, c.provincia, "España"].filter(Boolean).join(", ");
    let result = await geocodeAddress(query);
    // Addresses with "nave", floor/suite numbers, etc. often don't match on
    // Nominatim. Fall back to municipio-level so the company still gets a
    // usable (coarser) pin instead of staying unlocated indefinitely.
    if (!result && c.municipio) {
      await new Promise((r) => setTimeout(r, 1100));
      const fallbackQuery = [c.municipio, c.provincia, "España"].filter(Boolean).join(", ");
      result = await geocodeAddress(fallbackQuery);
    }
    if (result) {
      await pool.query("UPDATE companies SET latitud = $1, longitud = $2 WHERE id = $3", [result.lat, result.lon, c.id]);
      updated++;
    }
    // Respect Nominatim's ~1 request/second usage policy.
    await new Promise((r) => setTimeout(r, 1100));
  }

  revalidatePath("/empresas/mapa");
  return { processed: rows.length, updated };
}
