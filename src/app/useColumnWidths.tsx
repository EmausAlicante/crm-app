"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_WIDTH = 60;

// Shared by every resizable list table (Empresas, Facturación, Emails).
// Widths persist per table under their own storageKey so resizing one
// table's columns never affects another's.
export function useColumnWidths(storageKey: string, defaultWidth = 160) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setWidths(JSON.parse(raw));
    } catch {
      // malformed/unavailable storage — keep starting empty
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [widths, loaded, storageKey]);

  const drag = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      drag.current = { key, startX: e.clientX, startWidth: widths[key] ?? defaultWidth };

      function onMove(ev: MouseEvent) {
        if (!drag.current) return;
        const next = Math.max(MIN_WIDTH, drag.current.startWidth + (ev.clientX - drag.current.startX));
        setWidths((prev) => ({ ...prev, [drag.current!.key]: next }));
      }
      function onUp() {
        drag.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [widths, defaultWidth]
  );

  const getWidth = useCallback((key: string) => widths[key] ?? defaultWidth, [widths, defaultWidth]);
  const resetWidths = useCallback(() => setWidths({}), []);

  return { getWidth, startResize, resetWidths };
}

export function ResizeHandle({ onResizeStart }: { onResizeStart: (e: React.MouseEvent) => void }) {
  return (
    <span
      onMouseDown={onResizeStart}
      onClick={(e) => e.stopPropagation()}
      title="Arrastra para ajustar el ancho"
      className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize select-none touch-none hover:bg-blue-300/50"
    />
  );
}

export type ResizableColumn = { key: string; label: string };

// Drop-in replacement for a static <thead> — renders the <colgroup> that
// actually controls each <td>'s width (via table-layout: fixed on the
// parent <table>) plus the header row with drag handles. Meant to sit
// directly before a server-rendered <tbody> inside the same <table>.
export function ResizableTableHead({
  storageKey,
  columns,
  defaultWidth = 160,
}: {
  storageKey: string;
  columns: ResizableColumn[];
  defaultWidth?: number;
}) {
  const { getWidth, startResize } = useColumnWidths(storageKey, defaultWidth);

  return (
    <>
      <colgroup>
        {columns.map((c) => (
          <col key={c.key} style={{ width: getWidth(c.key) }} />
        ))}
      </colgroup>
      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
        <tr>
          {columns.map((c) => (
            <th key={c.key} className="relative text-left font-medium px-4 py-2.5 whitespace-nowrap overflow-hidden">
              {c.label}
              <ResizeHandle onResizeStart={startResize(c.key)} />
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}
