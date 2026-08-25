import pool, { schemaReady } from "./db";

export type AppSettings = {
  logoUrl: string | null;
  timezone: string;
  notifyEmail: string | null;
};

export async function getSettings(): Promise<AppSettings> {
  await schemaReady;
  const { rows } = await pool.query("SELECT logo_url, timezone, notify_email FROM app_settings WHERE id = 1");
  const row = rows[0];
  return {
    logoUrl: row?.logo_url ?? null,
    timezone: row?.timezone ?? "Europe/Madrid",
    notifyEmail: row?.notify_email ?? null,
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  await schemaReady;
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (patch.logoUrl !== undefined) {
    sets.push(`logo_url = $${i}`);
    values.push(patch.logoUrl);
    i++;
  }
  if (patch.timezone !== undefined) {
    sets.push(`timezone = $${i}`);
    values.push(patch.timezone);
    i++;
  }
  if (patch.notifyEmail !== undefined) {
    sets.push(`notify_email = $${i}`);
    values.push(patch.notifyEmail);
    i++;
  }
  if (sets.length === 0) return;
  await pool.query(`UPDATE app_settings SET ${sets.join(", ")}, updated_at = now() WHERE id = 1`, values);
}
