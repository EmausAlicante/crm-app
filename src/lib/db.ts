import { Pool, types } from "pg";
import fs from "node:fs";
import path from "node:path";

// Return DATE/TIMESTAMP columns as the raw string Postgres sends instead of a
// parsed JS Date object — our types/UI expect plain strings (e.g. "2026-07-08").
types.setTypeParser(types.builtins.DATE, (val) => val);
types.setTypeParser(types.builtins.TIMESTAMP, (val) => val);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val) => val);

declare global {
  // eslint-disable-next-line no-var
  var __crmPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __crmSchemaReady: Promise<void> | undefined;
}

function isTransientConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Both patterns show up when Neon's compute is waking from autosuspend:
  // an already-open connection gets dropped mid-handshake ("Connection
  // terminated"), or a fresh one doesn't finish authenticating before pg's
  // internal timeout ("Authentication timed out", code 08P01).
  return /Connection terminated/i.test(err.message) || /Authentication timed out/i.test(err.message);
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida. Configúrala en .env.local (ver .env.example).");
  }
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    // Serverless-friendly sizing: each function instance only needs a couple
    // of connections, and idle ones are recycled well before Neon's own
    // idle/suspend timeout would otherwise kill them out from under us.
    // No connectionTimeoutMillis: Neon's compute can take a few seconds to
    // wake from autosuspend on a cold connection, and cutting that off early
    // just turns "a bit slow" into a hard failure.
    max: 5,
    idleTimeoutMillis: 10_000,
  });
  // Required by node-postgres: an idle client that the server (or Neon's
  // autosuspend) closes out-of-band emits an 'error' event on the pool.
  // Without a listener this becomes an unhandled rejection; the pool itself
  // still discards the dead client and issues a fresh one on the next query.
  pool.on("error", (err) => {
    console.error("Postgres pool error (idle client dropped, will reconnect on next query):", err.message);
  });

  // Neon (and any Postgres behind a proxy/pooler with idle or autosuspend
  // timeouts) can drop a pooled connection between the time it's handed out
  // and the time it's used, or while waking from suspend. That surfaces as
  // "Connection terminated unexpectedly" on an otherwise-fine query — retry
  // once with a fresh connection before giving up.
  const rawQuery = pool.query.bind(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pool as any).query = async (...args: any[]) => {
    try {
      return await rawQuery(...(args as Parameters<typeof rawQuery>));
    } catch (err) {
      if (!isTransientConnectionError(err)) throw err;
      console.warn("Retrying query after transient Postgres connection error:", (err as Error).message);
      return await rawQuery(...(args as Parameters<typeof rawQuery>));
    }
  };

  return pool;
}

const pool = global.__crmPool ?? createPool();
if (process.env.NODE_ENV !== "production") global.__crmPool = pool;

async function ensureSchema(): Promise<void> {
  const schema = fs.readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf-8");
  // Goes through the wrapped pool.query above, so a transient connection
  // drop while waking Neon from autosuspend gets one automatic retry here too.
  await pool.query(schema);
}

if (!global.__crmSchemaReady) {
  global.__crmSchemaReady = ensureSchema();
}
export const schemaReady = global.__crmSchemaReady;

export default pool;
