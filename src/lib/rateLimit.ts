import pool, { schemaReady } from "./db";

// DB-backed cooldown (not in-memory) because Vercel serverless instances are
// ephemeral — an in-memory Map wouldn't survive across cold starts and gives
// no real protection. This isn't meant to police a malicious multi-user
// audience, just to stop a UI bug/double-click/retry-loop from firing the
// same paid AI action back-to-back. Returns true if the action is allowed.
export async function checkRateLimit(key: string, cooldownSeconds: number): Promise<boolean> {
  await schemaReady;
  const { rows } = await pool.query(
    `INSERT INTO rate_limits (key, last_run) VALUES ($1, now())
     ON CONFLICT (key) DO UPDATE SET last_run = now()
     WHERE rate_limits.last_run < now() - ($2 || ' seconds')::interval
     RETURNING key`,
    [key, cooldownSeconds]
  );
  return rows.length > 0;
}
