import { getAnthropic, MODEL_FABLE } from "./anthropic";

export const EMAIL_CATEGORIES = ["Urgente", "Acción requerida", "Informativo", "Spam"] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export type EmailClassification = {
  categoria: EmailCategory;
  razon: string;
};

const TOOL_NAME = "clasificar_email";

const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    categoria: { type: "string", enum: [...EMAIL_CATEGORIES] },
    razon: { type: "string", description: "Explicación breve de la clasificación (una frase)" },
  },
  required: ["categoria", "razon"],
};

const SYSTEM_PROMPT = `Eres un asistente que clasifica emails entrantes para un comercial de NETEL, distribuidor \
de MATIC (plataforma SaaS de control de accesos), que gestiona una red de distribuidores del sector de puertas \
automáticas (fabricantes, instaladores, SAT, integradores).

Clasifica cada email en una categoría llamando a la herramienta "${TOOL_NAME}":
- "Urgente": requiere respuesta o atención inmediata (queja, problema, solicitud con plazo cercano).
- "Acción requerida": necesita alguna acción del comercial pero no es urgente (petición de información, seguimiento de una visita).
- "Informativo": no requiere acción (confirmaciones automáticas, newsletters del sector, FYI).
- "Spam": publicidad no solicitada, phishing, o completamente irrelevante para el negocio.`;

export async function classifyEmail(subject: string, body: string, fromEmail: string): Promise<EmailClassification> {
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: MODEL_FABLE,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `De: ${fromEmail}\nAsunto: ${subject}\n\nCuerpo:\n${body.slice(0, 3000)}` },
    ],
    tools: [{ name: TOOL_NAME, description: "Registra la clasificación del email", input_schema: TOOL_SCHEMA }],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("El modelo no devolvió una clasificación.");
  return block.input as EmailClassification;
}
