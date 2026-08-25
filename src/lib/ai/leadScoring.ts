import { getAnthropic, MODEL_FABLE } from "./anthropic";

export type LeadScoreEstimate = { valoracion: number; resumen: string };

const TOOL_NAME = "estimar_valoracion_lead";

const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    valoracion: { type: "number", description: "Valoración comercial del lead, entre 0 y 5 (puede llevar un decimal, ej. 3.5)" },
    resumen: { type: "string", description: "1-2 frases explicando en qué te basas para la estimación" },
  },
  required: ["valoracion", "resumen"],
};

// Best-effort fetch of a company's own website text, to give the model real
// signal instead of guessing purely from the company name. Failures are silent —
// the estimate just falls back to whatever other fields are available.
async function fetchWebsiteText(web: string | null): Promise<string> {
  if (!web) return "";
  const url = web.startsWith("http") ? web : `https://${web}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CRMMaticBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
  } catch {
    return "";
  }
}

const SYSTEM_PROMPT = `Eres un analista comercial de NETEL, distribuidor de MATIC (plataforma SaaS de control de accesos \
con LoRa y AES-128, para el sector de puertas automáticas). Antes de la primera reunión con un lead, dale una \
valoración comercial de 0 a 5 estrellas a partir de la información pública disponible (su web, nombre, ubicación, \
notas). Ten en cuenta cosas como: si es fabricante/instalador/SAT/distribuidor del sector de puertas automáticas o \
control de accesos, su tamaño y trayectoria aparente, si trabaja con comunidades de vecinos, si tiene SAT propio, \
delegaciones, o ya distribuye marcas relacionadas. Sé conservador: si hay poca información, da una valoración \
media-baja en vez de una alta sin evidencia — no inventes datos. Esta es una ESTIMACIÓN PRELIMINAR que el comercial \
revisará y corregirá en la primera reunión real.`;

export async function estimateLeadScore(company: {
  empresa: string;
  web: string | null;
  direccion: string | null;
  municipio: string | null;
  clasificacion: string | null;
  observaciones: string | null;
}): Promise<LeadScoreEstimate> {
  const anthropic = getAnthropic();
  const websiteText = await fetchWebsiteText(company.web);

  const contextParts = [
    `Empresa: ${company.empresa}`,
    company.clasificacion ? `Clasificación conocida: ${company.clasificacion}` : null,
    company.direccion || company.municipio ? `Ubicación: ${[company.direccion, company.municipio].filter(Boolean).join(", ")}` : null,
    company.observaciones ? `Notas: ${company.observaciones}` : null,
    websiteText ? `Contenido de su web (${company.web}):\n${websiteText}` : `No se pudo acceder a su web (${company.web ?? "no tiene"}).`,
  ].filter(Boolean);

  const message = await anthropic.messages.create({
    model: MODEL_FABLE,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: contextParts.join("\n\n") }],
    tools: [{ name: TOOL_NAME, description: "Registra la valoración estimada del lead", input_schema: TOOL_SCHEMA }],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("El modelo no devolvió una estimación.");
  const result = block.input as LeadScoreEstimate;
  return { ...result, valoracion: Math.max(0, Math.min(5, result.valoracion)) };
}
