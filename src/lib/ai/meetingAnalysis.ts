import { TIPOS_ACCION } from "@/lib/types";
import { getAnthropic, MODEL_FABLE } from "./anthropic";

export type MeetingAnalysis = {
  resumenEjecutivo: string;
  puntosClave: string[];
  compromisos: { descripcion: string; responsable: string | null; fecha: string | null }[];
  objeciones: string[];
  interesesCliente: string[];
  etapaRecomendada: string;
  etiquetasSugeridas: string[];
  proximasAcciones: { titulo: string; tipo: string; fecha: string | null }[];
};

const TOOL_NAME = "registrar_analisis_reunion";

function buildToolSchema(estados: string[]) {
  return {
  type: "object" as const,
  properties: {
    resumenEjecutivo: { type: "string", description: "3-5 frases resumiendo la reunión" },
    puntosClave: { type: "array", items: { type: "string" } },
    compromisos: {
      type: "array",
      description: "Compromisos concretos adquiridos por cualquiera de las partes",
      items: {
        type: "object",
        properties: {
          descripcion: { type: "string" },
          responsable: { type: ["string", "null"] },
          fecha: { type: ["string", "null"], description: "Formato YYYY-MM-DD si se menciona una fecha" },
        },
        required: ["descripcion"],
      },
    },
    objeciones: { type: "array", items: { type: "string" } },
    interesesCliente: { type: "array", items: { type: "string" } },
    etapaRecomendada: { type: "string", enum: estados },
    etiquetasSugeridas: {
      type: "array",
      items: { type: "string" },
      description: "Etiquetas cortas de clasificación comercial (ej: 'Interesado en SaaS', 'Precio sensible')",
    },
    proximasAcciones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          tipo: { type: "string", enum: [...TIPOS_ACCION] },
          fecha: { type: ["string", "null"] },
        },
        required: ["titulo", "tipo"],
      },
    },
  },
  required: [
    "resumenEjecutivo", "puntosClave", "compromisos", "objeciones",
    "interesesCliente", "etapaRecomendada", "etiquetasSugeridas", "proximasAcciones",
  ],
  };
}

function buildSystemPrompt(estados: string[]): string {
  return `Eres un asistente de análisis para el equipo comercial de NETEL, que distribuye MATIC \
(plataforma SaaS de control de accesos con LoRa, AES-128 y app móvil) a través de una red de distribuidores \
(fabricantes, instaladores, SAT, integradores del sector de puertas automáticas).

Analiza la transcripción o las notas de una reunión/llamada con una empresa prospecto y extrae información \
estructurada para el CRM llamando a la herramienta "${TOOL_NAME}". Sé conciso y concreto — usa la información \
que realmente aparece en el texto, no inventes datos. Si algo no se menciona, deja el array vacío o el campo en null.

Para "etapaRecomendada" elige la fase del pipeline más adecuada según cómo haya ido la reunión, de entre estas \
(en orden): ${estados.join(", ")}.`;
}

export async function analyzeMeeting(text: string, companyContext: string, estados: string[]): Promise<MeetingAnalysis> {
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: MODEL_FABLE,
    max_tokens: 2048,
    system: buildSystemPrompt(estados),
    messages: [
      { role: "user", content: `Empresa: ${companyContext}\n\nTranscripción/notas de la reunión:\n${text}` },
    ],
    tools: [
      { name: TOOL_NAME, description: "Registra el análisis estructurado de la reunión", input_schema: buildToolSchema(estados) },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("El modelo no devolvió un análisis.");
  return block.input as MeetingAnalysis;
}
