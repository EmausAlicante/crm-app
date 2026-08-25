import type { EmailAccount } from "@/lib/types";
import { TrashIcon } from "../icons";
import { createEmailAccountAction, deleteEmailAccountAction, toggleEmailAccountAction } from "@/app/emails/accountActions";

function AccountRow({ account }: { account: EmailAccount }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800">
          {account.label ? `${account.label} · ` : ""}
          {account.email}
        </div>
        <div className="text-xs text-slate-500">
          {account.imapHost}:{account.imapPort}
        </div>
      </div>
      <span
        className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0 ${
          account.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {account.activo ? "Activa" : "Pausada"}
      </span>
      <form action={toggleEmailAccountAction}>
        <input type="hidden" name="id" value={account.id} />
        <input type="hidden" name="activo" value={(!account.activo).toString()} />
        <button type="submit" className="text-xs text-blue-600 hover:underline shrink-0">
          {account.activo ? "Pausar" : "Activar"}
        </button>
      </form>
      <form action={deleteEmailAccountAction}>
        <input type="hidden" name="id" value={account.id} />
        <button
          type="submit"
          title="Eliminar cuenta"
          aria-label="Eliminar cuenta"
          className="text-red-400 hover:text-red-600 shrink-0"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </form>
    </li>
  );
}

export default function EmailAccountsSection({ accounts }: { accounts: EmailAccount[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <h2 className="font-medium text-slate-800">Cuentas de email</h2>

      {accounts.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No has añadido ninguna cuenta todavía.</p>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-blue-600 hover:underline">+ Añadir cuenta de email</summary>
        <form action={createEmailAccountAction} className="mt-3 grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Etiqueta (opcional)</span>
            <input name="label" placeholder="Ej: Comercial" className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Email *</span>
            <input name="email" type="email" required placeholder="tu@gmail.com" className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Servidor IMAP</span>
            <input name="imapHost" defaultValue="imap.gmail.com" className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">Puerto</span>
            <input name="imapPort" type="number" defaultValue={993} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-slate-600">Contraseña de aplicación *</span>
            <input
              name="imapPassword"
              type="password"
              required
              placeholder="16 caracteres, generada en Google Account → Seguridad → Contraseñas de aplicaciones"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
          >
            + Añadir cuenta
          </button>
        </form>
      </details>
    </section>
  );
}
