"use client";

import { useState } from "react";
import Link from "next/link";
import { sanearLoteAction } from "./saneamientoActions";
import type { SaneamientoLogEntry } from "@/lib/saneamientoLog";

type HistorialItem = {
  id: number;
  empresa: string;
  investigada: boolean;
  valorada: boolean;
  error: string | null;
  createdAt?: string;
};

function fromLog(entries: SaneamientoLogEntry[]): HistorialItem[] {
  return entries.map((e) => ({
    id: e.companyId,
    empresa: e.empresa,
    investigada: e.investigada,
    valorada: e.valorada,
    error: e.error,
    createdAt: e.createdAt,
  }));
}

export default function SaneamientoClient({
  pendientesInicial,
  historialInicial,
}: {
  pendientesInicial: number;
  historialInicial: SaneamientoLogEntry[];
}) {
  const [pendientes, setPendientes] = useState(pendientesInicial);
  const [batchSize, setBatchSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>(fromLog(historialInicial));

  async function handleLote() {
    setLoading(true);
    setError(null);
    try {
      const result = await sanearLoteAction(batchSize);
      setHistorial((prev) => [...result.procesadas, ...prev]);
      setPendientes(result.pendientesRestantes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar el lote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-medium text-slate-800">
              Leads pendientes de sanear{" "}
              <span className="text-slate-400 font-normal">
                · {pendientes} {pendientes === 1 ? "empresa" : "empresas"}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sin web, teléfono, dirección o valoración. Se procesan por lotes para controlar el coste de IA.
            </p>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Tamaño del lote</span>
            <input
              type="number"
              min={1}
              max={15}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value) || 5)}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={handleLote}
            disabled={loading || pendientes === 0}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saneando… (puede tardar un poco)" : `Sanear siguiente lote de ${batchSize}`}
          </button>
          {pendientes === 0 && !loading && (
            <span className="text-sm text-emerald-700">✓ No quedan leads pendientes de sanear.</span>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      </section>

      {historial.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
          <h2 className="font-medium text-slate-800">Últimos procesados</h2>
          <p className="text-xs text-slate-500 -mt-2">
            Este historial se guarda en la base de datos, así que sigue aquí aunque navegues a otra pantalla.
          </p>
          <ul className="flex flex-col gap-2">
            {historial.map((item, i) => (
              <li
                key={`${item.id}-${i}`}
                className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/empresas/${item.id}`} className="font-medium text-slate-800 hover:underline">
                      {item.empresa}
                    </Link>
                    {item.createdAt && (
                      <span className="text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.investigada && <span className="mr-2">✓ datos investigados</span>}
                    {item.valorada && <span className="mr-2">✓ valorada</span>}
                    {!item.investigada && !item.valorada && !item.error && (
                      <span>Solo se ha recalculado el Score NETEL (ya tenía el resto)</span>
                    )}
                    {item.error && <span className="text-red-600">Error: {item.error}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
