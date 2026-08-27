import { getAnthropic, MODEL_FABLE } from "./anthropic";

export type EnrichmentResult = {
  web: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  municipio: string | null;
  provincia: string | null;
};

const TOOL_NAME = "registrar_datos_encontrados";
const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    web: { type: "string", description: "Vacío si no se encontró" },
    telefono: { type: "string", description: "Vacío si no se encontró" },
    email: { type: "string", description: "Vacío si no se encontró" },
    direccion: { type: "string", description: "Calle y número, sin código postal ni ciudad. Vacío si no se encontró" },
    codigoPostal: { type: "string", description: "Código postal, 5 dígitos en España. Vacío si no se encontró" },
    municipio: { type: "string", description: "Vacío si no se encontró" },
    provincia: { type: "string", description: "Vacío si no se encontró" },
  },
  required: [],
};

const RESEARCH_SYSTEM_PROMPT = `Eres un investigador comercial para NETEL, distribuidor de MATIC (control de accesos \\
para el sector de puertas automáticas / automatismos). Te doy el nombre de UNA empresa concreta que ya está en \\
nuestro CRM, con los datos que ya tenemos de ella. Busca en internet (su propia web, Google, directorios, LinkedIn) \\
únicamente los datos de contacto que nos faltan: web, teléfono, email, dirección postal completa (calle y número, \\
código postal), municipio y provincia. No inventes ni supongas nada — si un dato concreto no aparece en la \\
búsqueda, dilo explícitamente. No hace falta que valores ni describas la empresa, solo que localices sus datos \\
de contacto reales.`;

function orEmptyToNull(v: string | undefined): string | null {
  return v && v.trim() !== "" ? v.trim() : null;
}

export async function enrichCompanyContactData(company: {
  empresa: string;
  web: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  municipio: string | null;
  provincia: string | null;
}): Promise<EnrichmentResult> {
  const anthropic = getAnthropic();

  const known = [
    `Empresa: ${company.empresa}`,
    company.municipio || company.provincia
      ? `Ubicación aproximada que ya tenemos: ${[company.municipio, company.provincia].filter(Boolean).join(", ")}`
      : null,
    `Datos que YA tenemos (no hace falta volver a buscarlos): ${
      [
        company.web ? `web ${company.web}` : null,
        company.telefono ? `teléfono ${company.telefono}` : null,
        company.email ? `email ${company.email}` : null,
        company.direccion ? `dirección ${company.direccion}` : null,
        company.codigoPostal ? `CP ${company.codigoPostal}` : null,
      ]
        .filter(Boolean)
        .join(", ") || "ninguno todavía"
    }`,
    `Datos que FALTAN y necesito que busques: ${
      [
        !company.web ? "web" : null,
        !company.telefono ? "teléfono" : null,
        !company.email ? "email" : null,
        !company.direccion ? "dirección" : null,
        !company.codigoPostal ? "código postal" : null,
        !company.municipio ? "municipio" : null,
        !company.provincia ? "provincia" : null,
      ]
        .filter(Boolean)
        .join(", ")
    }`,
  ].filter(Boolean);

  const researchMessage = await anthropic.messages.create({
    model: MODEL_FABLE,
    max_tokens: 2000,
    system: RESEARCH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: known.join("\n") }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
  });

  const researchText = researchMessage.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");
  if (!researchText.trim()) {
    return { web: null, telefono: null, email: null, direccion: null, codigoPostal: null, municipio: null, provincia: null };
  }

  const extractMessage = await anthropic.messages.create({
    model: MODEL_FABLE,
    max_tokens: 800,
    system:
      "Extrae del siguiente informe de investigación los datos de contacto que se hayan encontrado realmente. No inventes datos que no estén ya en el texto.",
    messages: [{ role: "user", content: researchText }],
    tools: [{ name: TOOL_NAME, description: "Registra los datos de contacto encontrados", input_schema: TOOL_SCHEMA }],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const block = extractMessage.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    return { web: null, telefono: null, email: null, direccion: null, codigoPostal: null, municipio: null, provincia: null };
  }
  const raw = block.input as Record<string, string>;
  return {
    web: orEmptyToNull(raw.web),
    telefono: orEmptyToNull(raw.telefono),
    email: orEmptyToNull(raw.email),
    direccion: orEmptyToNull(raw.direccion),
    codigoPostal: orEmptyToNull(raw.codigoPostal),
    municipio: orEmptyToNull(raw.municipio),
    provincia: orEmptyToNull(raw.provincia),
  };
}
