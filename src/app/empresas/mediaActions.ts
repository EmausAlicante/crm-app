"use server";

import { revalidatePath } from "next/cache";
import { getCompany, updateCompany } from "@/lib/companies";
import { listPipelineEstadoNames } from "@/lib/pipelineEstados";
import {
  createRecording,
  deleteRecording,
  getRecording,
  saveAnalysis,
  saveAnalysisError,
  saveTranscript,
} from "@/lib/recordings";
import { deleteFile } from "@/lib/blob";
import { openaiConfigured } from "@/lib/ai/openai";
import { anthropicConfigured } from "@/lib/ai/anthropic";
import { transcribeAudio } from "@/lib/ai/whisper";
import { analyzeMeeting } from "@/lib/ai/meetingAnalysis";
import { applyMeetingAnalysis } from "@/lib/ai/applyAnalysis";
import { checkRateLimit } from "@/lib/rateLimit";

// The file itself is uploaded client-side directly to Vercel Blob (see
// LogoUploader.tsx / DocumentUploader.tsx / UploadRecordingForm.tsx +
// api/documentos/upload/route.ts) to avoid the Server Action body size limit
// — a scanned bank/LOPD PDF or a phone-camera logo photo routinely exceeds
// the default 1MB cap, which made every such upload fail.
async function saveCompanyFileUrl(
  companyId: number,
  field: "logoUrl" | "documentoBancarioUrl" | "lopdDocumentoUrl",
  url: string
) {
  const previous = await getCompany(companyId);
  await updateCompany(companyId, { [field]: url });
  if (previous?.[field]) await deleteFile(previous[field] as string);
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/empresas");
}

export async function saveLogoUrlAction(companyId: number, url: string) {
  await saveCompanyFileUrl(companyId, "logoUrl", url);
}

export async function deleteLogoAction(formData: FormData) {
  const companyId = Number(formData.get("companyId"));
  const company = await getCompany(companyId);
  if (company?.logoUrl) await deleteFile(company.logoUrl);
  await updateCompany(companyId, { logoUrl: null });
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/empresas");
}

export async function saveDocumentoBancarioUrlAction(companyId: number, url: string) {
  await saveCompanyFileUrl(companyId, "documentoBancarioUrl", url);
}

export async function deleteDocumentoBancarioAction(formData: FormData) {
  await deleteCompanyDocument(formData, "documentoBancarioUrl");
}

export async function saveLopdDocumentoUrlAction(companyId: number, url: string) {
  await saveCompanyFileUrl(companyId, "lopdDocumentoUrl", url);
}

export async function deleteLopdDocumentoAction(formData: FormData) {
  await deleteCompanyDocument(formData, "lopdDocumentoUrl");
}

async function deleteCompanyDocument(formData: FormData, field: "documentoBancarioUrl" | "lopdDocumentoUrl") {
  const companyId = Number(formData.get("companyId"));
  const company = await getCompany(companyId);
  if (company?.[field]) await deleteFile(company[field] as string);
  await updateCompany(companyId, { [field]: null });
  revalidatePath(`/empresas/${companyId}`);
}

async function runAnalysis(recordingId: number, companyId: number, text: string) {
  const allowed = await checkRateLimit(`analyze-recording:${recordingId}`, 10);
  if (!allowed) return;
  try {
    const [company, estados] = await Promise.all([getCompany(companyId), listPipelineEstadoNames()]);
    const analysis = await analyzeMeeting(text, company?.empresa ?? "desconocida", estados);
    await saveAnalysis(recordingId, analysis);
    await applyMeetingAnalysis(companyId, analysis);
  } catch (e) {
    await saveAnalysisError(recordingId, e instanceof Error ? e.message : String(e));
  }
}

export async function createRecordingFromUrlAction(input: {
  companyId: number;
  titulo: string | null;
  notas: string | null;
  audioUrl: string;
  audioFileName: string;
}) {
  const recordingId = await createRecording({
    companyId: input.companyId,
    titulo: input.titulo,
    audioUrl: input.audioUrl,
    notas: input.notas,
  });

  if (openaiConfigured) {
    try {
      const res = await fetch(input.audioUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      const transcript = await transcribeAudio(buffer, input.audioFileName);
      await saveTranscript(recordingId, transcript);
      if (anthropicConfigured) await runAnalysis(recordingId, input.companyId, transcript);
    } catch (e) {
      await saveAnalysisError(recordingId, e instanceof Error ? e.message : String(e));
    }
  }

  revalidatePath(`/empresas/${input.companyId}`);
}

export async function createNotesRecordingAction(formData: FormData) {
  const companyId = Number(formData.get("companyId"));
  const titulo = formData.get("titulo");
  const notas = formData.get("notas");
  const notasText = typeof notas === "string" ? notas.trim() : "";
  if (!notasText) return;

  await createRecording({
    companyId,
    titulo: typeof titulo === "string" && titulo.trim() ? titulo.trim() : null,
    audioUrl: null,
    notas: notasText,
  });

  revalidatePath(`/empresas/${companyId}`);
}

// Called from the Pipeline "Marcar hecha" flow when the user jots down what
// happened on a call/email/visit — logs it as a (text-only) recording and, if
// AI is configured, analyzes it immediately so the next step shows up right
// there instead of requiring a trip to the Reuniones tab.
export async function logActionResultAction(companyId: number, titulo: string, resultado: string): Promise<number> {
  const recordingId = await createRecording({ companyId, titulo, audioUrl: null, notas: resultado });
  if (anthropicConfigured) await runAnalysis(recordingId, companyId, resultado);
  revalidatePath(`/empresas/${companyId}`);
  return recordingId;
}

export async function analyzeRecordingAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  const recording = await getRecording(id);
  if (!recording) return;

  const text = recording.transcript || recording.notas;
  if (!text) return;

  await runAnalysis(id, companyId, text);
  revalidatePath(`/empresas/${companyId}`);
}

export async function deleteRecordingAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  const recording = await getRecording(id);
  if (recording?.audioUrl) await deleteFile(recording.audioUrl);
  await deleteRecording(id);
  revalidatePath(`/empresas/${companyId}`);
}
