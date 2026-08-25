import type { RutaDia } from "@/lib/rutaDias";
import { ZONAS } from "@/lib/constants";
import { TrashIcon } from "../icons";
import { createRutaDiaAction, deleteRutaDiaAction, updateRutaDiaAction } from "./rutaDiasActions";

function ZonaSelect({ name, value }: { name: string; value: string | null }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
      <option value="">Sin zona (ej. seguimiento telefónico)</option>
      {ZONAS.map((z) => (
        <option key={z} value={z}>
          {z}
        </option>
      ))}
    </select>
  );
}

function RutaDiaForm({ rutaDia }: { rutaDia?: RutaDia }) {
  return (
    <form action={rutaDia ? updateRutaDiaAction : createRutaDiaAction} className="grid sm:grid-cols-2 gap-3">
      {rutaDia && <input type="hidden" name="id" value={rutaDia.id} />}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Día *</span>
        <input name="dia" required defaultValue={rutaDia?.dia} placeholder="Ej: Lunes" className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Zona</span>
        <ZonaSelect name="zona" value={rutaDia?.zona ?? null} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Orden</span>
        <input name="orden" type="number" defaultValue={rutaDia?.orden ?? 0} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="text-slate-600">Notas (municipios, tipo de jornada...)</span>
        <input name="notas" defaultValue={rutaDia?.notas ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <button type="submit" className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
        {rutaDia ? "Guardar cambios" : "+ Añadir día"}
      </button>
    </form>
  );
}

export default function RutaDiasSection({ rutaDias }: { rutaDias: RutaDia[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-medium text-slate-800">Planificación de rutas</h2>
        <p className="text-xs text-slate-500 mt-1">Qué zona toca visitar cada día. Se refleja en la página de Rutas.</p>
      </div>

      {rutaDias.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {rutaDias.map((rd) => (
            <li key={rd.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">
                    {rd.dia} {rd.zona && <span className="text-slate-400 font-normal">· {rd.zona}</span>}
                  </div>
                  {rd.notas && <div className="text-xs text-slate-500">{rd.notas}</div>}
                </div>
                <form action={deleteRutaDiaAction}>
                  <input type="hidden" name="id" value={rd.id} />
                  <button type="submit" title="Eliminar día" aria-label="Eliminar día" className="text-red-400 hover:text-red-600 shrink-0">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </form>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-blue-600 hover:underline">Editar</summary>
                <div className="mt-3">
                  <RutaDiaForm rutaDia={rd} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No hay días configurados todavía.</p>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-blue-600 hover:underline">+ Añadir día</summary>
        <div className="mt-3">
          <RutaDiaForm />
        </div>
      </details>
    </section>
  );
}
