import pool, { schemaReady } from "./db";

export async function listTagColors(): Promise<Record<string, string>> {
  await schemaReady;
  const { rows } = await pool.query("SELECT tag, color FROM tag_colors");
  const map: Record<string, string> = {};
  for (const r of rows as { tag: string; color: string }[]) map[r.tag] = r.color;
  return map;
}

// Every distinct tag currently used across companies' clasificacion field
// (comma-separated free text), so Configuración can offer a color picker for
// each one even though there's no fixed catalog of allowed tags.
export async function listDistinctTags(): Promise<string[]> {
  await schemaReady;
  const { rows } = await pool.query(
    `SELECT DISTINCT trim(t) AS tag
     FROM companies, unnest(string_to_array(clasificacion, ',')) AS t
     WHERE clasificacion IS NOT NULL AND trim(t) <> ''
     ORDER BY 1`
  );
  return rows.map((r) => r.tag as string);
}

export async function setTagColor(tag: string, color: string): Promise<void> {
  await schemaReady;
  await pool.query(
    "INSERT INTO tag_colors (tag, color) VALUES ($1, $2) ON CONFLICT (tag) DO UPDATE SET color = EXCLUDED.color",
    [tag, color]
  );
}

export async function deleteTagColor(tag: string): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM tag_colors WHERE tag = $1", [tag]);
}
