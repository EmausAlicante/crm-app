import type { Company } from "@/lib/types";

export type GroupableField = "provincia" | "municipio" | "estado" | "zonaRuta";

export const GROUPABLE_FIELDS: { key: GroupableField; label: string }[] = [
  { key: "provincia", label: "Provincia" },
  { key: "municipio", label: "Ciudad" },
  { key: "estado", label: "Estado" },
  { key: "zonaRuta", label: "Zona de ruta" },
];

export function isGroupableField(v: string): v is GroupableField {
  return GROUPABLE_FIELDS.some((g) => g.key === v);
}

export type GroupNode = {
  key: string;
  count: number;
  companies?: Company[];
  children?: GroupNode[];
};

// Recursive: groups by fields[0], then within each bucket groups by the
// remaining fields — leaf nodes (fields exhausted) hold the companies
// directly instead of further children.
export function groupCompanies(companies: Company[], fields: GroupableField[]): GroupNode[] {
  if (fields.length === 0) return [];
  const [field, ...rest] = fields;
  const groups = new Map<string, Company[]>();
  for (const c of companies) {
    const raw = c[field] as string | null;
    const key = raw && raw.trim() !== "" ? raw : "(Sin especificar)";
    const bucket = groups.get(key);
    if (bucket) bucket.push(c);
    else groups.set(key, [c]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([key, list]) =>
      rest.length > 0
        ? { key, count: list.length, children: groupCompanies(list, rest) }
        : { key, count: list.length, companies: list }
    );
}
