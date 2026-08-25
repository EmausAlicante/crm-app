import type { Company } from "@/lib/types";

export type ColumnKey =
  | "municipio"
  | "provincia"
  | "zonaRuta"
  | "clasificacion"
  | "estado"
  | "valoracion"
  | "telefono"
  | "email"
  | "web"
  | "contacto"
  | "cargo"
  | "direccion"
  | "codigoPostal"
  | "cif"
  | "fechaUltimaVisita"
  | "proximaVisita"
  | "updatedAt";

export type SortField = ColumnKey | "empresa";

export const COLUMN_DEFS: { key: ColumnKey; label: string }[] = [
  { key: "municipio", label: "Municipio" },
  { key: "provincia", label: "Provincia" },
  { key: "zonaRuta", label: "Zona de ruta" },
  { key: "clasificacion", label: "Clasificación" },
  { key: "estado", label: "Estado" },
  { key: "valoracion", label: "Valoración" },
  { key: "telefono", label: "Teléfono" },
  { key: "email", label: "Email" },
  { key: "web", label: "Web" },
  { key: "contacto", label: "Contacto" },
  { key: "cargo", label: "Cargo" },
  { key: "direccion", label: "Dirección" },
  { key: "codigoPostal", label: "Código postal" },
  { key: "cif", label: "CIF" },
  { key: "fechaUltimaVisita", label: "Última visita" },
  { key: "proximaVisita", label: "Próxima visita" },
  { key: "updatedAt", label: "Última modificación" },
];

export const ALL_COLUMN_KEYS: ColumnKey[] = COLUMN_DEFS.map((c) => c.key);

// What EmpresasTable showed before columns became configurable, plus
// "Última modificación" (when any field last changed) since knowing whether
// a company has gone stale is important for follow-up — kept as the default
// so existing views only change by gaining this one column.
export const DEFAULT_COLUMNS: ColumnKey[] = ["municipio", "clasificacion", "estado", "valoracion", "updatedAt"];

export function sortValue(c: Company, field: SortField): string | number {
  switch (field) {
    case "empresa":
      return c.empresa.toLowerCase();
    case "valoracion":
      return c.valoracion ?? -1;
    case "estado":
      return c.estado.toLowerCase();
    case "fechaUltimaVisita":
      return c.fechaUltimaVisita ?? "";
    case "proximaVisita":
      return c.proximaVisita ?? "";
    case "updatedAt":
      // TIMESTAMPTZ text output trims trailing zeros in the fractional
      // seconds, so plain string comparison sorts inconsistently — compare
      // as real timestamps instead.
      return new Date(c.updatedAt).getTime();
    default:
      return (c[field] ?? "").toString().toLowerCase();
  }
}
