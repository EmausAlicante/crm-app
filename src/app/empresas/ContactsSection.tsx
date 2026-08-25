import type { Contact } from "@/lib/types";
import { TrashIcon } from "../icons";
import { saveContactAction, deleteContactAction } from "./contactsActions";
import { ROLES_NETEL } from "@/lib/constants";

function ContactForm({ companyId, contact }: { companyId: number; contact?: Contact }) {
  return (
    <form action={saveContactAction} className="mt-3 grid sm:grid-cols-2 gap-3">
      <input type="hidden" name="companyId" value={companyId} />
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Nombre *</span>
        <input name="nombre" required defaultValue={contact?.nombre} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Cargo</span>
        <input name="cargo" defaultValue={contact?.cargo ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Email</span>
        <input name="email" type="email" defaultValue={contact?.email ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Teléfono</span>
        <input name="telefono" defaultValue={contact?.telefono ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Foto{contact?.fotoUrl ? " (deja vacío para mantener la actual)" : ""}</span>
        <input name="foto" type="file" accept="image/*" className="text-xs" />
      </label>
      <label className="flex items-center gap-2 mt-6">
        <input type="checkbox" name="esPrincipal" defaultChecked={contact?.esPrincipal ?? false} />
        <span className="text-slate-600">Contacto principal</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">Rol NETEL</span>
        <select
          name="rolNetel"
          defaultValue={contact?.rolNetel ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">— Ninguno —</option>
          {ROLES_NETEL.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600">LinkedIn</span>
        <input name="linkedinUrl" defaultValue={contact?.linkedinUrl ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-slate-600">Notas</span>
        <textarea name="notas" rows={2} defaultValue={contact?.notas ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <button
        type="submit"
        className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
      >
        {contact ? "Guardar cambios" : "Guardar contacto"}
      </button>
    </form>
  );
}

export default function ContactsSection({ companyId, contacts }: { companyId: number; contacts: Contact[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <h2 className="font-medium text-slate-800">Contactos</h2>

      {contacts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                {c.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.fotoUrl} alt={c.nombre} className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm shrink-0">
                    {c.nombre.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    {c.nombre}
                    {c.esPrincipal && (
                      <span className="text-[10px] uppercase tracking-wide bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                        Principal
                      </span>
                    )}
                    {c.rolNetel && (
                      <span className="text-[10px] uppercase tracking-wide bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">
                        {ROLES_NETEL.find((r) => r.key === c.rolNetel)?.label ?? c.rolNetel}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {[c.cargo, c.email, c.telefono].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <form action={deleteContactAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="companyId" value={companyId} />
                  <button
                    type="submit"
                    title="Eliminar contacto"
                    aria-label="Eliminar contacto"
                    className="text-red-400 hover:text-red-600 shrink-0"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </form>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-blue-600 hover:underline">Editar</summary>
                <ContactForm companyId={companyId} contact={c} />
              </details>
            </li>
          ))}
        </ul>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-blue-600 hover:underline">+ Añadir contacto</summary>
        <ContactForm companyId={companyId} />
      </details>
    </section>
  );
}
