import type { Recording } from "@/lib/types";
import { blobConfigured } from "@/lib/blob";
import { openaiConfigured } from "@/lib/ai/openai";
import { anthropicConfigured } from "@/lib/ai/anthropic";
import { formatDateTime } from "@/lib/formatDate";
import { TrashIcon } from "../icons";
import { analyzeRecordingAction, createNotesRecordingAction, deleteRecordingAction } from "./mediaActions";
import UploadRecordingForm from "./UploadRecordingForm";
import AnalysisCard from "./AnalysisCard";

export default function RecordingsSection({
  companyId,
  recordings,
  timezone,
}: {
  companyId: number;
  recordings: Recording[];
  timezone: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <h2 className="font-medium text-slate-800">Reuniones y grabaciones</h2>

      {recordings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {recordings.map((r) => {
            const canAnalyze = anthropicConfigured && (r.transcript || r.notas);
            return (
              <li key={r.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{r.titulo || "Reunión"}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(r.fecha, timezone)}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {canAnalyze && (
                      <form action={analyzeRecordingAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="companyId" value={companyId} />
                        <button type="submit" className="text-xs text-blue-600 hover:underline">
                          {r.analysis ? "Re-analizar con IA" : "Analizar con IA"}
                        </button>
                      </form>
                    )}
                    <form action={deleteRecordingAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="companyId" value={companyId} />
                      <button type="submit" title="Eliminar" aria-label="Eliminar grabación" className="text-red-400 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>

                {r.audioUrl && <audio controls src={r.audioUrl} className="w-full mt-2" />}
                {r.notas && <p className="text-xs text-slate-500 mt-2">{r.notas}</p>}
                {r.transcript && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-slate-500 hover:underline">Ver transcripción</summary>
                    <p className="mt-1 text-slate-500 whitespace-pre-wrap">{r.transcript}</p>
                  </details>
                )}

                {r.analysis && <AnalysisCard analysis={r.analysis} />}
                {r.analysisError && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                    No se pudo analizar: {r.analysisError}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {blobConfigured ? (
        <UploadRecordingForm
          companyId={companyId}
          submitLabel={
            openaiConfigured && anthropicConfigured
              ? "Subir y transcribir/analizar"
              : openaiConfigured
                ? "Subir y transcribir"
                : "Subir grabación"
          }
        />
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
          Almacenamiento de archivos no configurado todavía. Activa Vercel Blob en el proyecto y añade
          BLOB_READ_WRITE_TOKEN para poder subir grabaciones, logos y fotos.
        </p>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-blue-600 hover:underline">
          + Registrar reunión solo con notas (sin audio)
        </summary>
        <form action={createNotesRecordingAction} className="mt-3 grid sm:grid-cols-2 gap-3">
          <input type="hidden" name="companyId" value={companyId} />
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Título</span>
            <input name="titulo" placeholder="Ej: Llamada 6 julio" className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-slate-600">Notas de la reunión *</span>
            <textarea
              name="notas"
              required
              rows={4}
              placeholder="Escribe aquí lo hablado en la reunión..."
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 justify-self-start rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
          >
            Guardar notas
          </button>
        </form>
      </details>
    </section>
  );
}
