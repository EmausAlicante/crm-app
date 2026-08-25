import Anthropic from "@anthropic-ai/sdk";

export const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!anthropicConfigured) {
    throw new Error("ANTHROPIC_API_KEY no configurada. Añádela a .env.local para activar los agentes de IA.");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export const MODEL_FABLE = "claude-fable-5";
