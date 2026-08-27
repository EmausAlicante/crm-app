"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "./login/actions";
import DueActionsBell from "./DueActionsBell";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/empresas", label: "Empresas" },
  { href: "/rutas", label: "Rutas" },
  { href: "/prospeccion", label: "Prospección" },
  { href: "/saneamiento", label: "Saneamiento" },
  { href: "/emails", label: "Emails" },
  { href: "/facturacion", label: "Facturación" },
  { href: "/documentos", label: "Documentos" },
  { href: "/configuracion", label: "Configuración" },
];

function DueBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-medium leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Header({
  logoUrl,
  dueCount = 0,
  timezone,
}: {
  logoUrl: string | null;
  dueCount?: number;
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900 shrink-0">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="h-7 w-7 rounded object-contain" />
          )}
          CRM <span className="text-blue-600">MATIC</span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="px-3 py-1.5 rounded-md hover:bg-slate-100 flex items-center">
                {link.label}
                {link.href === "/dashboard" && <DueBadge count={dueCount} />}
              </Link>
            ))}
            <form action={logoutAction}>
              <button type="submit" className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                Cerrar sesión
              </button>
            </form>
          </nav>

          <DueActionsBell timezone={timezone} />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 shrink-0"
          >
            {open ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-slate-200 px-4 sm:px-6 py-2 flex flex-col text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="px-3 py-2.5 rounded-md hover:bg-slate-100 flex items-center">
              {link.label}
              {link.href === "/dashboard" && <DueBadge count={dueCount} />}
            </Link>
          ))}
          <form action={logoutAction}>
            <button type="submit" className="w-full text-left px-3 py-2.5 rounded-md hover:bg-slate-100 text-slate-500">
              Cerrar sesión
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
