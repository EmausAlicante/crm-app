import Link from "next/link";
import { listCompanies } from "@/lib/companies";
import { ensureChargesGenerated, listBillingPlans, listCharges } from "@/lib/billing";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/formatDate";
import { BILLING_FRECUENCIAS, CHARGE_ESTADOS } from "@/lib/types";
import { TrashIcon } from "../icons";
import { ResizableTableHead } from "../useColumnWidths";
import { createBillingPlanAction, deletePlanAction, setChargeEstadoAction, togglePlanActivoAction } from "./actions";

const CHARGES_COLUMNS = [
  { key: "empresa", label: "Empresa" },
  { key: "concepto", label: "Concepto" },
  { key: "importe", label: "Importe" },
  { key: "fecha", label: "Fecha prevista" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "Acciones" },
];

export const dynamic = "force-dynamic";

const ESTADO_STYLES: Record<string, string> = {
  Pendiente: "bg-amber-100 text-amber-700",
  Emitida: "bg-sky-100 text-sky-700",
  Cobrada: "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-slate-100 text-slate-400",
};

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureChargesGenerated();

  const sp = await searchParams;
  const estadoFilter = typeof sp.estado === "string" ? sp.estado : "";

  const [plans, allCharges, companies, settings] = await Promise.all([
    listBillingPlans(),
    listCharges(),
    listCompanies(),
    getSettings(),
  ]);
  const charges = estadoFilter ? allCharges.filter((c) => c.estado === estadoFilter) : allCharges;
  const pendientes = allCharges.filter((c) => c.estado === "Pendiente");
  const totalPendiente = pendientes.reduce((sum, c) => sum + c.importe, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Facturación</h1>
        <p className="text-sm text-slate-500 mt-1">
          Planes de facturación recurrente por empresa y las cuotas que generan.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-slate-900">{plans.filter((p) => p.activo).length}</div>
          <div className="text-sm mt-1 text-slate-500">Planes activos</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-slate-900">{pendientes.length}</div>
          <div className="text-sm mt-1 text-slate-500">Cuotas pendientes</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-slate-900">{totalPendiente.toFixed(2)} €</div>
          <div className="text-sm mt-1 text-slate-500">Importe pendiente</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-slate-900">{plans.length}</div>
          <div className="text-sm mt-1 text-slate-500">Total planes</div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="font-medium text-slate-800">Planes de facturación</h2>

        {plans.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800">
                    <Link href={`/empresas/${p.companyId}`} className="text-blue-600 hover:underline">
                      {p.companyName}
                    </Link>{" "}
                    — {p.concepto}
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.importe.toFixed(2)} € · {p.frecuencia} · desde {formatDate(p.fechaInicio, settings.timezone)}
                    {p.fechaFin ? ` hasta ${formatDate(p.fechaFin, settings.timezone)}` : " · sin fecha fin"}
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0 ${
                    p.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.activo ? "Activo" : "Pausado"}
                </span>
                <form action={togglePlanActivoAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="activo" value={(!p.activo).toString()} />
                  <button type="submit" className="text-xs text-blue-600 hover:underline shrink-0">
                    {p.activo ? "Pausar" : "Reanudar"}
                  </button>
                </form>
                <form action={deletePlanAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    title="Eliminar plan"
                    aria-label="Eliminar plan"
                    className="text-red-400 hover:text-red-600 shrink-0"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No hay planes de facturación todavía.</p>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 hover:underline">+ Nuevo plan de facturación</summary>
          <form action={createBillingPlanAction} className="mt-3 grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-slate-600">Empresa *</span>
              <select name="companyId" required className="rounded-lg border border-slate-300 px-3 py-2">
                <option value="">Selecciona una empresa...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.empresa}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-slate-600">Concepto *</span>
              <input name="concepto" required placeholder="Ej: Suscripción MATIC SaaS" className="rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-600">Importe (€) *</span>
              <input name="importe" type="number" step="0.01" min="0" required className="rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-600">Frecuencia</span>
              <select name="frecuencia" defaultValue="Mensual" className="rounded-lg border border-slate-300 px-3 py-2">
                {BILLING_FRECUENCIAS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-600">Fecha de inicio *</span>
              <input name="fechaInicio" type="date" required className="rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-600">Fecha fin (opcional)</span>
              <input name="fechaFin" type="date" className="rounded-lg border border-slate-300 px-3 py-2" />
              <span className="text-xs text-slate-400">Déjalo vacío para que siga facturando indefinidamente.</span>
            </label>
            <button
              type="submit"
              className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
            >
              + Crear plan
            </button>
          </form>
        </details>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="font-medium text-slate-800">Cuotas</h2>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/facturacion"
            className={`text-sm rounded-lg px-3 py-1.5 border ${!estadoFilter ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:bg-slate-50"}`}
          >
            Todas
          </Link>
          {CHARGE_ESTADOS.map((e) => (
            <Link
              key={e}
              href={`/facturacion?estado=${encodeURIComponent(e)}`}
              className={`text-sm rounded-lg px-3 py-1.5 border ${estadoFilter === e ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:bg-slate-50"}`}
            >
              {e}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="table-fixed text-sm">
            <ResizableTableHead storageKey="crm-facturacion-anchos-v1" columns={CHARGES_COLUMNS} />
            <tbody className="divide-y divide-slate-100">
              {charges.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-2.5 overflow-hidden">
                    <Link href={`/empresas/${c.companyId}`} className="text-blue-600 hover:underline truncate block">
                      {c.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-800 overflow-hidden truncate">{c.concepto}</td>
                  <td className="px-4 py-2.5 text-slate-800 overflow-hidden truncate">{c.importe.toFixed(2)} €</td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap overflow-hidden">{formatDate(c.fechaPrevista, settings.timezone)}</td>
                  <td className="px-4 py-2.5 overflow-hidden">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_STYLES[c.estado] ?? "bg-slate-100 text-slate-600"}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 overflow-hidden">
                    <div className="flex flex-wrap gap-2">
                      {c.estado === "Pendiente" && (
                        <form action={setChargeEstadoAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="estado" value="Emitida" />
                          <button type="submit" className="text-xs text-blue-600 hover:underline">
                            Marcar emitida
                          </button>
                        </form>
                      )}
                      {c.estado === "Emitida" && (
                        <form action={setChargeEstadoAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="estado" value="Cobrada" />
                          <button type="submit" className="text-xs text-emerald-600 hover:underline">
                            Marcar cobrada
                          </button>
                        </form>
                      )}
                      {(c.estado === "Pendiente" || c.estado === "Emitida") && (
                        <form action={setChargeEstadoAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="estado" value="Cancelada" />
                          <button type="submit" className="text-xs text-red-500 hover:underline">
                            Cancelar
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {charges.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No hay cuotas {estadoFilter ? `en estado "${estadoFilter}"` : "todavía"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
