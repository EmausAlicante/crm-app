// Traduce texto libre del CSV de importación ("Especialización", "Marcas") a los
// booleanos esp_*/marca_* que ya existen en companies. Reutiliza los catálogos de
// constants.ts en vez de mantener una lista de palabras clave separada, para que
// añadir una especialización o marca nueva en un solo sitio baste para ambos.
import { ESPECIALIZACIONES, MARCAS, type EspecializacionKey, type MarcaKey } from "./constants";

// Palabras clave adicionales que no coinciden literalmente con la label mostrada
// en la UI (p. ej. "industria" además de "industrial", o "hörmann" sin tilde).
const ESPECIALIZACION_SINONIMOS: Partial<Record<EspecializacionKey, string[]>> = {
  espIndustrial: ["industria"],
  espGarajes: ["garaje"],
  espAdministradores: ["administrador", "administradores de fincas"],
  espControlAccesos: ["control de acceso"],
};

const MARCA_SINONIMOS: Partial<Record<MarcaKey, string[]>> = {
  marcaHormann: ["hormann"], // por si llega sin tilde
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos
}

// Devuelve { espComunidades: true, espParking: true, ... } a partir del texto
// combinado de "Clasificación" + "Especialización" (ambos describen mercado/actividad).
export function parseEspecializacion(texto: string): Partial<Record<EspecializacionKey, boolean>> {
  const norm = normalize(texto);
  const out: Partial<Record<EspecializacionKey, boolean>> = {};
  for (const { key, label } of ESPECIALIZACIONES) {
    const candidatos = [normalize(label), ...(ESPECIALIZACION_SINONIMOS[key] ?? []).map(normalize)];
    if (candidatos.some((c) => norm.includes(c))) out[key] = true;
  }
  return out;
}

// Devuelve { marcaNice: true, marcaFaac: true, ... } a partir del texto de "Marcas".
// Si detecta contenido pero ninguna marca conocida, marca "marcaOtras" (igual que
// el resto de la app trata las marcas no catalogadas).
export function parseMarcas(texto: string): Partial<Record<MarcaKey, boolean>> {
  const norm = normalize(texto);
  const out: Partial<Record<MarcaKey, boolean>> = {};
  for (const { key, label } of MARCAS) {
    if (key === "marcaOtras") continue;
    const candidatos = [normalize(label), ...(MARCA_SINONIMOS[key] ?? []).map(normalize)];
    if (candidatos.some((c) => norm.includes(c))) out[key] = true;
  }
  if (texto.trim() && Object.keys(out).length === 0) out.marcaOtras = true;
  return out;
}
