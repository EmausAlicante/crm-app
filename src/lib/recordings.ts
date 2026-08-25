import pool, { schemaReady } from "./db";
import type { Recording } from "./types";
import type { MeetingAnalysis } from "./ai/meetingAnalysis";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecording(row: any): Recording {
  return {
    id: row.id,
    companyId: row.company_id,
    titulo: row.titulo,
    audioUrl: row.audio_url,
    fecha: row.fecha,
    notas: row.notas,
    transcript: row.transcript,
    analysis: row.analysis,
    analyzedAt: row.analyzed_at,
    analysisError: row.analysis_error,
  };
}

export async function listRecordings(companyId: number): Promise<Recording[]> {
  await schemaReady;
  const { rows } = await pool.query("SELECT * FROM recordings WHERE company_id = $1 ORDER BY fecha DESC", [
    companyId,
  ]);
  return rows.map(rowToRecording);
}

export async function getRecording(id: number): Promise<Recording | null> {
  await schemaReady;
  const { rows } = await pool.query("SELECT * FROM recordings WHERE id = $1", [id]);
  return rows[0] ? rowToRecording(rows[0]) : null;
}

export async function createRecording(input: {
  companyId: number;
  titulo: string | null;
  audioUrl: string | null;
  notas: string | null;
}): Promise<number> {
  await schemaReady;
  const { rows } = await pool.query(
    "INSERT INTO recordings (company_id, titulo, audio_url, notas) VALUES ($1, $2, $3, $4) RETURNING id",
    [input.companyId, input.titulo, input.audioUrl, input.notas]
  );
  return rows[0].id as number;
}

export async function deleteRecording(id: number): Promise<void> {
  await schemaReady;
  await pool.query("DELETE FROM recordings WHERE id = $1", [id]);
}

export async function saveTranscript(id: number, transcript: string): Promise<void> {
  await schemaReady;
  await pool.query("UPDATE recordings SET transcript = $1 WHERE id = $2", [transcript, id]);
}

export async function saveAnalysis(id: number, analysis: MeetingAnalysis): Promise<void> {
  await schemaReady;
  await pool.query(
    "UPDATE recordings SET analysis = $1, analyzed_at = now(), analysis_error = NULL WHERE id = $2",
    [JSON.stringify(analysis), id]
  );
}

export async function saveAnalysisError(id: number, error: string): Promise<void> {
  await schemaReady;
  await pool.query("UPDATE recordings SET analysis_error = $1 WHERE id = $2", [error, id]);
}
