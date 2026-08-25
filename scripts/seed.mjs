import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL. Define .env.local con la cadena de conexión de Postgres (Neon).");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

await pool.query(fs.readFileSync(path.join(root, "src/lib/schema.sql"), "utf-8"));

const seedRows = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-data.json"), "utf-8"));

const { rows: existingRows } = await pool.query("SELECT COUNT(*)::int as c FROM companies");
if (existingRows[0].c > 0) {
  console.log(
    `La tabla ya tiene ${existingRows[0].c} filas. Aborto para no duplicar (vacía la tabla companies si quieres reimportar).`
  );
  await pool.end();
  process.exit(0);
}

const expectedFields = [
  "empresa", "nombreComercial", "direccion", "municipio", "codigoPostal", "provincia",
  "web", "email", "telefono", "contacto", "cargo", "clasificacion",
  "espComunidades", "espIndustrial", "espParking", "espBarreras", "espControlAccesos", "espRfid", "espLpr", "espAutomatismos",
  "marcaNice", "marcaFaac", "marcaBft", "marcaCame", "marcaHormann", "marcaMotorline", "marcaErreka", "marcaGibidi", "marcaBeninca", "marcaRoger", "marcaDea", "marcaOtras",
  "scoreMantenimiento", "scoreComunidades", "scoreControlAccesos", "scoreSatPropio", "scoreTamano", "scoreDelegaciones", "scoreMarcas",
  "estado", "observaciones", "productoRecomendado", "argumentario", "zonaRuta",
];
const boolFields = new Set([
  "espComunidades", "espIndustrial", "espParking", "espBarreras", "espControlAccesos", "espRfid", "espLpr", "espAutomatismos",
  "marcaNice", "marcaFaac", "marcaBft", "marcaCame", "marcaHormann", "marcaMotorline", "marcaErreka", "marcaGibidi", "marcaBeninca", "marcaRoger", "marcaDea", "marcaOtras",
]);
const colFor = {
  empresa: "empresa", nombreComercial: "nombre_comercial", direccion: "direccion", municipio: "municipio",
  codigoPostal: "codigo_postal", provincia: "provincia", web: "web", email: "email", telefono: "telefono",
  contacto: "contacto", cargo: "cargo", clasificacion: "clasificacion",
  espComunidades: "esp_comunidades", espIndustrial: "esp_industrial", espParking: "esp_parking", espBarreras: "esp_barreras",
  espControlAccesos: "esp_control_accesos", espRfid: "esp_rfid", espLpr: "esp_lpr", espAutomatismos: "esp_automatismos",
  marcaNice: "marca_nice", marcaFaac: "marca_faac", marcaBft: "marca_bft", marcaCame: "marca_came",
  marcaHormann: "marca_hormann", marcaMotorline: "marca_motorline", marcaErreka: "marca_erreka", marcaGibidi: "marca_gibidi",
  marcaBeninca: "marca_beninca", marcaRoger: "marca_roger", marcaDea: "marca_dea", marcaOtras: "marca_otras",
  scoreMantenimiento: "score_mantenimiento", scoreComunidades: "score_comunidades", scoreControlAccesos: "score_control_accesos",
  scoreSatPropio: "score_sat_propio", scoreTamano: "score_tamano", scoreDelegaciones: "score_delegaciones", scoreMarcas: "score_marcas",
  estado: "estado", observaciones: "observaciones", productoRecomendado: "producto_recomendado",
  argumentario: "argumentario", zonaRuta: "zona_ruta",
};

const cols = expectedFields.map((f) => colFor[f]);
const placeholders = expectedFields.map((_, i) => `$${i + 1}`);
const insertSql = `INSERT INTO companies (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`;

for (const row of seedRows) {
  const values = expectedFields.map((f) => {
    const v = row[f] ?? null;
    if (boolFields.has(f)) return !!v;
    return v;
  });
  await pool.query(insertSql, values);
}

console.log(`Importadas ${seedRows.length} empresas.`);
await pool.end();
