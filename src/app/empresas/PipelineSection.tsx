import type { PipelineAction, Recording } from "@/lib/types";
import { TIPOS_ACCION } from "@/lib/types";
import { anthropicConfigured } from "@/lib/ai/anthropic";
import { TrashIcon } from "../icons";
import { createActionAction, deleteActionAction, toggleActionAction, updateActionAction } from "./pipelineActions";
import NextActionBanner from "./NextActionBanner";
import PostActionAnalysis from "./PostActionAnalysis";
import SubmitButton from "./SubmitButton";

export const TIPO_STYLES: Record<string, string> = {
  Llamada: "bg-sky-100 text-sky-700",
  Visita: "bg-indigo-100 text-indigo-700",
  Email: "bg-purple-100 text-purple-700",
  Seguimiento: "bg-amber-100 text-amber-700",
  Presupuesto: "bg-emerald-100 text-emerald-700",
  Otro: "bg-slate-100 text-slate-700",
};

function ActionRow({ action, companyId }: { action: PipelineAction; companyId: number }) {
  return (
    <li className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-center gap-3">
        <span
          className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0 ${
            TIPO_STYLES[action.tipo] ?? TIPO_STYLES.Otro
          }`}
        >
          {action.tipo}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${action.completada ? "line-through text-slate-400" : "text-slate-800"}`}>
            {action.titulo}
          </div>
          {(action.fechaPrevista || action.notas) && (
            <div className="text-xs text-slate-500">
              {action.fechaPrevista && (
                <span>
                  {action.fechaPrevista}
                  {action.horaPrevista && ` · ${action.horaPrevista.slice(0, 5)}`}
                </span>
              )}
              {action.fechaPrevista && action.notas && " · "}
              {action.notas}
            </div>
          )}
        </div>
        <form action={toggleActionAction}>
          <input type="hidden" name="id" value={action.id} />
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="completada" value={(!action.completada).toString()} />
          <SubmitButton pendingText="..." className="text-xs text-blue-600 hover:underline shrink-0">
            {action.completada ? "Reabrir" : "Marcar hecha"}
          </SubmitButton>
        </form>
        <form action={deleteActionAction}>
          <input type="hidden" name="id" value={action.id} />
          <input type="hidden" name="companyId" value={companyId} />
          <button
            type="submit"
            title="Eliminar acción"
            aria-label="Eliminar acción"
            className="text-red-400 hover:text-red-600 shrink-0"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
      {!action.completada && anthropicConfigured && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-slate-500 hover:underline">
            + Qué ha pasado (opcional — la IA sugiere el siguiente paso)
          </summary>
          <form action={toggleActionAction} className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="id" value={action.id} />
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="completada" value="true" />
            <input type="hidden" name="titulo" value={action.titulo} />
            <textarea
              name="resultado"
              rows={2}
              placeholder="Ej: contactado, interesado en control de accesos, pide presupuesto para 3 puertas..."
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <SubmitButton
              pendingText="Analizando…"
              className="self-start rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Marcar hecha y analizar
            </SubmitButton>
          </form>
        </details>
      )}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-blue-600 hover:underline">Editar</summary>
        <form action={updateActionAction} className="mt-3 grid sm:grid-cols-2 gap-3">
          <input type="hidden" name="id" value={action.id} />
          <input type="hidden" name="companyId" value={companyId} />
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Tipo</span>
            <select name="tipo" defaultValue={action.tipo} className="rounded-lg border border-slate-300 px-3 py-2">
              {TIPOS_ACCION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Fecha prevista</span>
            <input
              type="date"
              name="fechaPrevista"
              defaultValue={action.fechaPrevista ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Hora (opcional — si no la pones, cuenta como pendiente todo el día)</span>
            <input
              type="time"
              name="horaPrevista"
              defaultValue={action.horaPrevista?.slice(0, 5) ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-slate-600">Acción *</span>
            <input
              name="titulo"
              required
              defaultValue={action.titulo}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-slate-600">Notas</span>
            <input name="notas" defaultValue={action.notas ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
          >
            Guardar cambios
          </button>
        </form>
      </details>
    </li>
  );
}

export default function PipelineSection({
  companyId,
  actions,
  sugerirSiguiente = false,
  analisisRecording = null,
}: {
  companyId: number;
  actions: PipelineAction[];
  sugerirSiguiente?: boolean;
  analisisRecording?: Recording | null;
}) {
  const pending = actions.filter((a) => !a.completada);
  const done = actions.filter((a) => a.completada);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <h2 className="font-medium text-slate-800">Pipeline · próximas acciones</h2>

      <PostActionAnalysis recording={analisisRecording} />
      <NextActionBanner sugerirSiguiente={sugerirSiguiente && !analisisRecording} />

      {pending.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pending.map((a) => (
            <ActionRow key={a.id} action={a} companyId={companyId} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">Sin acciones pendientes.</p>
      )}

      <form action={createActionAction} className="grid sm:grid-cols-2 gap-3 text-sm">
        <input type="hidden" name="companyId" value={companyId} />
        <label className="flex flex-col gap-1">
          <span className="text-slate-600">Tipo</span>
          <select name="tipo" defaultValue="Seguimiento" className="rounded-lg border border-slate-300 px-3 py-2">
            {TIPOS_ACCION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-600">Fecha prevista</span>
          <input type="date" name="fechaPrevista" className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-600">Hora (opcional)</span>
          <input type="time" name="horaPrevista" className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-slate-600">Acción *</span>
          <input
            name="titulo"
            required
            placeholder="Ej: llamar para cerrar fecha de visita"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-slate-600">Notas</span>
          <input name="notas" className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button
          type="submit"
          className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
        >
          + Añadir al pipeline
        </button>
      </form>

      {done.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500 hover:underline">
            Completadas ({done.length})
          </summary>
          <ul className="flex flex-col gap-2 mt-3">
            {done.map((a) => (
              <ActionRow key={a.id} action={a} companyId={companyId} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
