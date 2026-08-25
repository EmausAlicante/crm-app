"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Company } from "@/lib/types";
import { contrastTextColor, DEFAULT_TAG_COLOR } from "@/lib/color";
import RatingBadge from "./RatingBadge";
import { updateEstadoAction } from "./actions";

// How close to the left/right edge (in px) triggers auto-scroll while dragging,
// and the fastest scroll speed (px/frame) right at the edge.
const EDGE_ZONE_PX = 80;
const MAX_SCROLL_SPEED = 18;

export default function EmpresasKanban({
  companies,
  estados,
  estadoColors,
}: {
  companies: Company[];
  estados: string[];
  estadoColors: Record<string, string>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverEstado, setDragOverEstado] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const pointerXRef = useRef<number | null>(null);

  // A plain mouse wheel only produces vertical delta, which does nothing on a
  // horizontal-only overflow container — it either sits inert or scrolls the
  // page instead, which reads as "it jumps straight to the end". Translate
  // vertical wheel motion into horizontal scroll here so the wheel just works.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el || el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already a horizontal gesture, leave it alone
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Auto-scroll the board while dragging a card near its left/right edge, so
  // a column that's currently off-screen can be reached without letting go.
  // Uses setInterval rather than requestAnimationFrame: browsers commonly
  // stall rAF callbacks while a native drag session is in progress (the OS
  // drag loop keeps the main thread busy), which would make rAF-based
  // auto-scroll unreliable mid-drag even though it looks fine in isolation.
  useEffect(() => {
    if (draggingId == null) return;
    const el = scrollRef.current;
    if (!el) return;
    const interval = setInterval(() => {
      const x = pointerXRef.current;
      if (x == null) return;
      const rect = el.getBoundingClientRect();
      const distLeft = x - rect.left;
      const distRight = rect.right - x;
      if (distLeft < EDGE_ZONE_PX) {
        el.scrollLeft -= MAX_SCROLL_SPEED * (1 - Math.max(distLeft, 0) / EDGE_ZONE_PX);
      } else if (distRight < EDGE_ZONE_PX) {
        el.scrollLeft += MAX_SCROLL_SPEED * (1 - Math.max(distRight, 0) / EDGE_ZONE_PX);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [draggingId]);

  function columnFor(estado: string): Company[] {
    return companies
      .filter((c) => (overrides[c.id] ?? c.estado) === estado)
      .sort((a, b) => (b.valoracion ?? -1) - (a.valoracion ?? -1));
  }

  // Safety net: a company whose estado no longer matches any configured
  // phase (e.g. stale data from before a rename) still gets its own column
  // instead of silently disappearing from the board.
  const estadosConHuerfanos = [
    ...estados,
    ...new Set(companies.map((c) => overrides[c.id] ?? c.estado).filter((e) => !estados.includes(e))),
  ];

  function handleDrop(estado: string) {
    setDragOverEstado(null);
    if (draggingId == null) return;
    const id = draggingId;
    setDraggingId(null);
    if ((overrides[id] ?? companies.find((c) => c.id === id)?.estado) === estado) return;
    setOverrides((prev) => ({ ...prev, [id]: estado }));
    startTransition(async () => {
      await updateEstadoAction(id, estado);
      router.refresh();
    });
  }

  return (
    <div
      ref={scrollRef}
      onDragOver={(e) => {
        pointerXRef.current = e.clientX;
      }}
      className="flex gap-3 overflow-x-auto pb-2"
    >
      {estadosConHuerfanos.map((estado) => {
        const cards = columnFor(estado);
        const isOver = dragOverEstado === estado;
        return (
          <div
            key={estado}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverEstado(estado);
            }}
            onDragLeave={() => setDragOverEstado((cur) => (cur === estado ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(estado);
            }}
            className={`flex-shrink-0 w-64 rounded-xl border p-2 flex flex-col gap-2 ${
              isOver ? "border-blue-400 bg-blue-50/50" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-1 px-1 py-1">
              <span
                className="text-xs font-medium rounded-full px-2 py-0.5 truncate"
                style={{
                  backgroundColor: estadoColors[estado] ?? DEFAULT_TAG_COLOR,
                  color: contrastTextColor(estadoColors[estado] ?? DEFAULT_TAG_COLOR),
                }}
              >
                {estado}
              </span>
              <span className="text-xs rounded-full bg-slate-200 text-slate-600 px-1.5 py-0.5 shrink-0">
                {cards.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[48px]">
              {cards.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(c.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    pointerXRef.current = null;
                  }}
                  onClick={() => router.push(`/empresas/${c.id}`)}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm hover:border-blue-300 hover:shadow-sm cursor-grab active:cursor-grabbing"
                >
                  <div className="font-medium text-slate-800 truncate">{c.empresa}</div>
                  <div className="text-xs text-slate-500 truncate">{c.municipio ?? "—"}</div>
                  <div className="mt-1">
                    <RatingBadge valoracion={c.valoracion} />
                  </div>
                </div>
              ))}
              {cards.length === 0 && <div className="text-xs text-slate-300 text-center py-3">Sin empresas</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
