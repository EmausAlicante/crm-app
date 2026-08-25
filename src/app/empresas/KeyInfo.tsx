import type { Company, Contact } from "@/lib/types";
import { formatDateTime } from "@/lib/formatDate";

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
      <div className="text-sm text-slate-800 truncate">{children}</div>
    </div>
  );
}

export default function KeyInfo({
  company,
  contacts,
  timezone,
}: {
  company: Company;
  contacts: Contact[];
  timezone: string;
}) {
  const direccionCompleta = [company.direccion, company.municipio, company.codigoPostal]
    .filter(Boolean)
    .join(", ");
  const mapsHref = direccionCompleta
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionCompleta)}`
    : null;

  const contactList =
    contacts.length > 0
      ? contacts
      : company.contacto
        ? [{ id: 0, nombre: company.contacto, cargo: company.cargo } as Contact]
        : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-7">
      <Item label="Dirección">
        {direccionCompleta ? (
          mapsHref ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              title={direccionCompleta}
              className="text-blue-600 hover:underline"
            >
              {direccionCompleta}
            </a>
          ) : (
            direccionCompleta
          )
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </Item>

      <Item label="Teléfono">
        {company.telefono ? (
          <a href={`tel:${company.telefono.replace(/\s+/g, "")}`} className="text-blue-600 hover:underline">
            {company.telefono}
          </a>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </Item>

      <Item label="WhatsApp">
        {company.whatsapp ? (
          <a
            href={`https://wa.me/${company.whatsapp.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {company.whatsapp}
          </a>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </Item>

      <Item label="Email">
        {company.email ? (
          <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
            {company.email}
          </a>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </Item>

      <Item label="Web">
        {company.web ? (
          <a
            href={/^https?:\/\//i.test(company.web) ? company.web : `https://${company.web}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {company.web}
          </a>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </Item>

      <Item label="Contactos">
        {contactList.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {contactList.map((c) => {
              const extras = [c.cargo, c.telefono].filter(Boolean).join(" · ");
              return (
                <div key={c.id} className="truncate">
                  {c.nombre}
                  {extras && <span className="text-slate-400"> · {extras}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </Item>

      <Item label="Última visita">
        {company.fechaUltimaVisita ?? <span className="text-slate-300">—</span>}
      </Item>

      <Item label="Última modificación">{formatDateTime(company.updatedAt, timezone)}</Item>
    </section>
  );
}
