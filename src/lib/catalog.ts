import pool, { schemaReady } from "./db";

export type CatalogType = "forma_pago" | "plazo_pago";

export type CatalogOption = {
  id: number;
  tipo: CatalogType;
  valor: string;
};

export async function listCatalogOptions(tipo: CatalogType): Promise<CatalogOption[]> {
  await schemaReady;
  const { rows } = await pool.query(
    "SELECT id, tipo, valor FROM catalog_options WHERE tipo = $1 ORDER BY valor ASC",
    [tipo]
  );
  return rows;
}

export async function createCatalogOption(tipo: CatalogType, valor: string): Promise<void> {
  await schemaReady;
  await pool.query(
    "INSERT INTO catalog_options (tipo, valor) VALUES ($1, $2) ON CONFLICT (tipo, valor) DO NOTHING",
    [tipo, valor]
  );
}

export async function deleteCatalogOption(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM catalog_options WHERE id = $1", [id]);
}
