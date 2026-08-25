import { getAnthropic, MODEL_FABLE } from "./anthropic";

export type LeadCandidate = {
  empresa: string;
  web: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  municipio: string | null;
  provincia: string | null;
  clasificacion: string | null;
  justificacion: string;
};

// Step 1: let Claude actually search the web (server-side tool — Anthropic
// runs the searches and folds the results back into this same call) and write
// up what it found in plain text. Kept separate from structured extraction
// because mixing a forced tool_choice with web_search in one call isn't
// reliable — the model can't freely search AND be forced into one other tool.
const RESEARCH_SYSTEM_PROMPT = `Eres un investigador comercial para NETEL, distribuidor de MATIC (plataforma de \
control de accesos para el sector de puertas automáticas / automatismos). Busca en internet empresas REALES \
(nunca inventadas) que encajen como leads comerciales: instaladores, fabricantes, distribuidores, SAT o empresas \
de mantenimiento de puertas automáticas, control de accesos, barreras, videoportero, domótica de accesos o \
automatismos similares. Para cada empresa que encuentres, anota lo que hayas podido verificar realmente en la \
búsqueda: nombre, web, teléfono, email, dirección postal completa (calle y código postal, no solo la ciudad) y \
municipio, y una frase breve justificando por qué encaja como lead. Busca específicamente estos datos de contacto \
en la propia web de la empresa o su ficha en Google/directorios, no solo en el primer resultado de búsqueda. \
No completes huecos con suposiciones — si un dato no aparece en la búsqueda, simplemente omítelo. No repitas la \
misma empresa dos veces.`;

const EXTRACT_TOOL_NAME = "registrar_candidatos";
const EXTRACT_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    candidatos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          empresa: { type: "string" },
          web: { type: "string", description: "Vacío si no se encontró" },
          telefono: { type: "string", description: "Vacío si no se encontró" },
          email: { type: "string", description: "Vacío si no se encontró" },
          direccion: { type: "string", description: "Calle y número, sin código postal ni ciudad. Vacío si no se encontró" },
          codigoPostal: { type: "string", description: "Código postal, 5 dígitos en España. Vacío si no se encontró" },
          municipio: { type: "string", description: "Vacío si no se encontró" },
          provincia: { type: "string", description: "Vacío si no se encontró" },
          clasificacion: {
            type: "string",
            description: "Ej: Instalador, Distribuidor, SAT, Fabricante, Empresa de mantenimiento. Vacío si no está claro",
          },
          justificacion: { type: "string", description: "1 frase: por qué encaja como lead" },
        },
        required: ["empresa", "justificacion"],
      },
    },
  },
  required: ["candidatos"],
};

function orEmptyToNull(v: string | undefined): string | null {
  return v && v.trim() !== "" ? v.trim() : null;
}

export async function searchLeads(terms: string[], ubicacion: string, maxResultados: number): Promise<LeadCandidate[]> {
  const anthropic = getAnthropic();

  const researchQuery = `Busca empresas en ${ubicacion}, España, relacionadas con: ${terms.join(", ")}. \
Quiero hasta ${maxResultados} empresas candidatas DISTINTAS entre sí, con su web, teléfono, email y dirección \
postal completa (calle, código postal, municipio) si los encuentras. Haz varias búsquedas con diferentes \
combinaciones de términos y fuentes (directorios, páginas amarillas, sus propias webs, LinkedIn) para cubrir \
bien la zona en vez de quedarte con los primeros resultados, y entra en la web de cada empresa candidata si hace \
falta para sacar el email y la dirección exacta.`;

  const researchMessage = await anthropic.messages.create({
    model: MODEL_FABLE,
    max_tokens: 4000,
    system: RESEARCH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: researchQuery }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
  });

  const researchText = researchMessage.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");
  if (!researchText.trim()) return [];

  const extractMessage = await anthropic.messages.create({
    model: MODEL_FABLE,
    max_tokens: 3000,
    system:
      "Convierte el siguiente informe de investigación comercial en una lista estructurada de empresas candidatas. No inventes datos que no estén ya en el texto.",
    messages: [{ role: "user", content: researchText }],
    tools: [
      { name: EXTRACT_TOOL_NAME, description: "Registra la lista de empresas candidatas encontradas", input_schema: EXTRACT_TOOL_SCHEMA },
    ],
    tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
  });

  const block = extractMessage.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return [];
  const raw = (block.input as { candidatos?: Record<string, string>[] }).candidatos ?? [];

  return raw
    .filter((c) => c.empresa && c.empresa.trim())
    .slice(0, maxResultados)
    .map((c) => ({
      empresa: c.empresa.trim(),
      web: orEmptyToNull(c.web),
      telefono: orEmptyToNull(c.telefono),
      email: orEmptyToNull(c.email),
      direccion: orEmptyToNull(c.direccion),
      codigoPostal: orEmptyToNull(c.codigoPostal),
      municipio: orEmptyToNull(c.municipio),
      provincia: orEmptyToNull(c.provincia),
      clasificacion: orEmptyToNull(c.clasificacion),
      justificacion: (c.justificacion ?? "").trim(),
    }));
}
