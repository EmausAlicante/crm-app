import OpenAI from "openai";

export const openaiConfigured = !!process.env.OPENAI_API_KEY;

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!openaiConfigured) {
    throw new Error("OPENAI_API_KEY no configurada. Añádela a .env.local para activar los agentes de IA.");
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
