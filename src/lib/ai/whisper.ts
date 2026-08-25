import { toFile } from "openai/uploads";
import { getOpenAI } from "./openai";

export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
  const openai = getOpenAI();
  const file = await toFile(buffer, filename);
  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "es",
  });
  return result.text;
}
