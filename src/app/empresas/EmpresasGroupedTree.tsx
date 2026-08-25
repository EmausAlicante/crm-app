import Link from "next/link";
import type { GroupNode } from "./grouping";
import RatingBadge from "./RatingBadge";
import EstadoBadge from "./EstadoBadge";

// Plain <details>/<summary> — expand/collapse needs no client JS at all,
// so this whole tree (including the leaf-level company rows) stays a
// Server Component.
function GroupRow({
  node,
  depth,
  estadoColors,
}: {
  node: GroupNode;
  depth: number;
  estadoColors: Record<string, string>;
}) {
  return (
    <details open={depth === 0} className="group border-b border-slate-100 last:border-b-0">
      <summary
        className="flex items-center justify-between gap-3 cursor-pointer px-4 py-2.5 hover:bg-slate-50 list-none"
        style={{ paddingLeft: 16 + depth * 20 }}
      >
        <span className="font-medium text-slate-800 flex items-center gap-2 min-w-0">
          <span className="text-slate-400 text-[10px] transition-transform group-open:rotate-90 shrink-0">▶</span>
          <span className="truncate">{node.key}</span>
        </span>
        <span className="text-xs text-slate-400 shrink-0">{node.count}</span>
      </summary>
      <div>
        {node.children
          ? node.children.map((child) => (
              <GroupRow key={child.key} node={child} depth={depth + 1} estadoColors={estadoColors} />
            ))
          : node.companies && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {node.companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-4" style={{ paddingLeft: 16 + (depth + 1) * 20 }}>
                        <Link href={`/empresas/${c.id}`} className="text-slate-800 hover:text-blue-600 font-medium">
                          {c.empresa}
                        </Link>
                        {c.contacto && <div className="text-xs text-slate-500">{c.contacto}</div>}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <EstadoBadge estado={c.estado} color={estadoColors[c.estado]} />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <RatingBadge valoracion={c.valoracion} />
                      </td>
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{c.telefono ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>
    </details>
  );
}

export default function EmpresasGroupedTree({
  groups,
  estadoColors,
}: {
  groups: GroupNode[];
  estadoColors: Record<string, string>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {groups.length > 0 ? (
        groups.map((g) => <GroupRow key={g.key} node={g} depth={0} estadoColors={estadoColors} />)
      ) : (
        <p className="px-4 py-10 text-center text-slate-400 text-sm">Sin resultados con estos filtros.</p>
      )}
    </div>
  );
}
