import Link from "next/link";
import { listEmails, getEmailStats } from "@/lib/emails";
import { listEmailAccounts } from "@/lib/emailAccounts";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/formatDate";
import { EMAIL_CATEGORIES } from "@/lib/types";
import { anthropicConfigured } from "@/lib/ai/anthropic";
import { ResizableTableHead } from "../useColumnWidths";
import SyncButton from "./SyncButton";

const EMAILS_COLUMNS = [
  { key: "de", label: "De" },
  { key: "asunto", label: "Asunto" },
  { key: "empresa", label: "Empresa" },
  { key: "categoria", label: "Categoría" },
  { key: "cuenta", label: "Cuenta" },
  { key: "recibido", label: "Recibido" },
];

export const dynamic = "force-dynamic";

const CATEGORY_STYLES: Record<string, string> = {
  Urgente: "bg-red-100 text-red-700",
  "Acción requerida": "bg-amber-100 text-amber-700",
  Informativo: "bg-slate-100 text-slate-600",
  Spam: "bg-slate-100 text-slate-400",
};

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const classification = typeof sp.categoria === "string" ? sp.categoria : "";

  const [emails, stats, accounts, settings] = await Promise.all([
    listEmails({ classification: classification || undefined }),
    getEmailStats(),
    listEmailAccounts(),
    getSettings(),
  ]);
  const hasAccounts = accounts.some((a) => a.activo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Emails</h1>
          <p className="text-sm text-slate-500 mt-1">
            Correo entrante clasificado y vinculado automáticamente a las empresas del CRM.
          </p>
        </div>
        {hasAccounts && anthropicConfigured && <SyncButton />}
      </div>

      {!hasAccounts && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3">
          Todavía no hay ninguna cuenta de email activa —{" "}
          <Link href="/configuracion" className="underline font-medium">
            añade una en Configuración
          </Link>{" "}
          para empezar a sincronizar correo.
        </div>
      )}
      {hasAccounts && !anthropicConfigured && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3">
          Falta <code>ANTHROPIC_API_KEY</code> para poder clasificar los correos.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-slate-900">{stats.total}</div>
          <div className="text-sm mt-1 text-slate-500">Total procesados</div>
        </div>
        {EMAIL_CATEGORIES.map((cat) => (
          <div key={cat} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-semibold text-slate-900">{stats.porCategoria[cat] ?? 0}</div>
            <div className="text-sm mt-1 text-slate-500">{cat}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/emails"
          className={`text-sm rounded-lg px-3 py-1.5 border ${!classification ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:bg-slate-50"}`}
        >
          Todos
        </Link>
        {EMAIL_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/emails?categoria=${encodeURIComponent(cat)}`}
            className={`text-sm rounded-lg px-3 py-1.5 border ${classification === cat ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:bg-slate-50"}`}
          >
            {cat}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="table-fixed text-sm">
          <ResizableTableHead storageKey="crm-emails-anchos-v1" columns={EMAILS_COLUMNS} />
          <tbody className="divide-y divide-slate-100">
            {emails.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50 align-top">
                <td className="px-4 py-2.5 overflow-hidden">
                  <div className="text-slate-800 truncate">{e.fromName || e.fromEmail}</div>
                  {e.fromName && <div className="text-xs text-slate-400 truncate">{e.fromEmail}</div>}
                </td>
                <td className="px-4 py-2.5 overflow-hidden">
                  <div className="font-medium text-slate-800 truncate">{e.subject}</div>
                  {e.bodyPreview && <div className="text-xs text-slate-400 line-clamp-2">{e.bodyPreview}</div>}
                  {e.classificationReason && (
                    <div className="text-xs text-slate-400 italic mt-0.5 truncate">{e.classificationReason}</div>
                  )}
                </td>
                <td className="px-4 py-2.5 overflow-hidden">
                  {e.companyId ? (
                    <Link href={`/empresas/${e.companyId}`} className="text-blue-600 hover:underline truncate block">
                      {e.companyName}
                    </Link>
                  ) : (
                    <span className="text-slate-300">Sin vincular</span>
                  )}
                </td>
                <td className="px-4 py-2.5 overflow-hidden">
                  {e.classification && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        CATEGORY_STYLES[e.classification] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {e.classification}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-500 overflow-hidden truncate">{e.accountEmail ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap overflow-hidden">
                  {e.receivedAt ? formatDateTime(e.receivedAt, settings.timezone) : "—"}
                </td>
              </tr>
            ))}
            {emails.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {hasAccounts
                    ? "Sin correos procesados todavía. Pulsa \"Sincronizar correo\"."
                    : "Añade una cuenta de email en Configuración para empezar a ver correos aquí."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
