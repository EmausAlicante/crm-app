import type { PipelineEstado } from "@/lib/pipelineEstados";
import { contrastTextColor, DEFAULT_TAG_COLOR } from "@/lib/color";
import { TrashIcon } from "../icons";
import { createPipelineEstadoAction, deletePipelineEstadoAction, updatePipelineEstadoAction } from "./pipelineEstadosActions";

function PipelineEstadoForm({ estado }: { estado?: PipelineEstado }) {
  return (
    <form action={estado ? updatePipelineEstadoAction : createPipelineEstadoAction} className="grid sm:grid-cols-3 gap-3">
      {estado && <input type="hidden" name="id" value={estado.id} />}
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="text-slate-600">Nombre de la fase *</span>
        <input
          name="nombre"
          required
          defaultValue={estado?.nombre}
          placeholder="Ej: Presupuesto enviado"
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Orden (posición en el Kanban)</span>
        <input name="orden" type="number" defaultValue={estado?.orden ?? 0} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Color</span>
        <input
          name="color"
          type="color"
          defaultValue={estado?.color ?? DEFAULT_TAG_COLOR}
          className="h-10 w-16 rounded border border-slate-300 cursor-pointer"
        />
      </label>
      <button type="submit" className="sm:col-span-3 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
        {estado ? "Guardar cambios" : "+ Añadir fase"}
      </button>
    </form>
  );
}

export default function PipelineEstadosSection({
  estados,
  bloqueado,
}: {
  estados: PipelineEstado[];
  bloqueado: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-medium text-slate-800">Fases del pipeline (Kanban)</h2>
        <p className="text-xs text-slate-500 mt-1">
          Las columnas del tablero Kanban de Empresas. Puedes renombrarlas (las empresas que ya estén en una fase se
          mueven con ella), reordenarlas, cambiarles el color o añadir nuevas.
        </p>
      </div>

      {bloqueado && (
        <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
          No se puede eliminar esa fase: todavía hay empresas asignadas a ella. Muévelas a otra fase primero (desde el
          Kanban o la ficha de cada empresa).
        </p>
      )}

      {estados.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {estados.map((e) => (
            <li key={e.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-medium rounded-full px-2.5 py-1 truncate max-w-[220px] shrink-0"
                  style={{ backgroundColor: e.color, color: contrastTextColor(e.color) }}
                >
                  {e.nombre}
                </span>
                <div className="flex-1 min-w-0 text-xs text-slate-400">{e.numEmpresas} empresa(s)</div>
                <form action={deletePipelineEstadoAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    title="Eliminar fase"
                    aria-label="Eliminar fase"
                    className="text-red-400 hover:text-red-600 shrink-0"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </form>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-blue-600 hover:underline">Editar</summary>
                <div className="mt-3">
                  <PipelineEstadoForm estado={e} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No hay fases configuradas todavía.</p>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-blue-600 hover:underline">+ Añadir fase</summary>
        <div className="mt-3">
          <PipelineEstadoForm />
        </div>
      </details>
    </section>
  );
}
