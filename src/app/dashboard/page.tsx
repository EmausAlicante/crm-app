import Link from "next/link";
import { getDashboardStats, listCompanies } from "@/lib/companies";
import { listUpcomingActions } from "@/lib/pipeline";
import { computeNextActionCandidates, getDailyDigest } from "@/lib/nextActions";
import { listPipelineEstadoNames } from "@/lib/pipelineEstados";
import { ZONAS, ratingBucketLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

function Card({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className={`text-sm mt-1 ${tone ?? "text-slate-500"}`}>{label}</div>
    </div>
  );
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-44 shrink-0 text-slate-600">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right text-slate-500 tabular-nums">{count}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, companies, upcoming, candidates, estados] = await Promise.all([
    getDashboardStats(),
    listCompanies(),
    listUpcomingActions(8),
    computeNextActionCandidates(),
    listPipelineEstadoNames(),
  ]);
  const digest = await getDailyDigest(candidates);

  const starCounts: Record<string, number> = {};
  for (const c of companies) {
    const s = ratingBucketLabel(c.valoracion);
    starCounts[s] = (starCounts[s] ?? 0) + 1;
  }
  const starOrder = [
    "★★★★★ Estratégico",
    "★★★★ Muy interesante",
    "★★★ Medio",
    "★★ Bajo",
    "★ Muy bajo",
    "Sin evaluar",
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard comercial</h1>
        <p className="text-sm text-slate-500 mt-1">Red de distribuidores MATIC — visión general</p>
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-medium text-blue-900">Prioridades de hoy</h2>
          <p className="text-sm text-blue-800 mt-1">{digest}</p>
        </div>
        {candidates.length > 0 && (
          <ul className="flex flex-col divide-y divide-blue-100">
            {candidates.map((c) => (
              <li key={c.companyId} className="py-2 flex items-center justify-between gap-3">
                <Link
                  href={`/empresas/${c.companyId}`}
                  className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate"
                >
                  {c.companyName}
                </Link>
                <span className="text-xs text-slate-600 text-right shrink-0">{c.motivo}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card label="Empresas totales" value={stats.total} />
        <Card label="Pendientes" value={stats.porEstado["Pendiente"] ?? 0} />
        <Card label="Visitadas" value={stats.porEstado["Visitado"] ?? 0} />
        <Card label="En negociación" value={stats.porEstado["Negociación"] ?? 0} />
        <Card label="Clientes" value={stats.porEstado["Cliente"] ?? 0} tone="text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium mb-4">Estado comercial</h2>
          <div className="flex flex-col gap-2.5">
            {estados.map((e) => (
              <Bar key={e} label={e} count={stats.porEstado[e] ?? 0} total={stats.total} />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium mb-4">Valoración comercial (scoring)</h2>
          <div className="flex flex-col gap-2.5">
            {starOrder
              .filter((s) => starCounts[s])
              .map((s) => (
                <Bar key={s} label={s} count={starCounts[s]} total={stats.total} />
              ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium mb-4">Por zona de ruta</h2>
          <div className="flex flex-col gap-2.5">
            {ZONAS.map((z) => (
              <Bar key={z} label={z} count={stats.porZona[z] ?? 0} total={stats.total} />
            ))}
          </div>
          <Link href="/rutas" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
            Ver planificación de rutas →
          </Link>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium mb-4">Especialización</h2>
          <div className="flex flex-col gap-2.5">
            {stats.porEspecializacion
              .filter((e) => e.count > 0)
              .map((e) => (
                <Bar key={e.label} label={e.label} count={e.count} total={stats.total} />
              ))}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Distribuidores potenciales identificados</h2>
            <div className="text-2xl font-semibold text-blue-600">{stats.distribuidoresPotenciales}</div>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Empresas cuya clasificación incluye &quot;Distribuidor&quot;.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium mb-3">Próximas acciones del pipeline</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">No hay acciones pendientes registradas todavía.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {upcoming.map((a) => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/empresas/${a.companyId}`}
                      className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate block"
                    >
                      {a.titulo}
                    </Link>
                    <div className="text-xs text-slate-500 truncate">{a.empresa}</div>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {a.tipo}
                    {a.fechaPrevista && ` · ${a.fechaPrevista}`}
                    {a.horaPrevista && ` ${a.horaPrevista.slice(0, 5)}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
