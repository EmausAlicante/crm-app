"use client";

import { useState } from "react";
import Link from "next/link";
import type { LeadCandidate } from "@/lib/ai/leadSearch";
import { importLeadsAction, searchLeadsAction, type ImportLeadsResult } from "./searchActions";

function TermChips({ terms, onRemove }: { terms: string[]; onRemove: (t: string) => void }) {
  if (terms.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {terms.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1"
        >
          {t}
          <button
            type="button"
            onClick={() => onRemove(t)}
            aria-label={`Quitar término ${t}`}
            className="text-blue-400 hover:text-blue-700"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

export default function ProspeccionClient() {
  const [terms, setTerms] = useState<string[]>([
    "instalador puertas automáticas",
    "control de accesos",
  ]);
  const [termInput, setTermInput] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [maxResultados, setMaxResultados] = useState(15);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<LeadCandidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searched, setSearched] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportLeadsResult | null>(null);

  function addTerm() {
    const t = termInput.trim();
    if (t && !terms.includes(t)) setTerms((prev) => [...prev, t]);
    setTermInput("");
  }

  async function handleSearch() {
    if (terms.length === 0 || !ubicacion.trim()) return;
    setLoading(true);
    setError(null);
    setImportResult(null);
    try {
      const results = await searchLeadsAction(terms, ubicacion, maxResultados);
      setCandidates(results);
      setSelected(new Set(results.map((_, i) => i)));
      setSearched(true);
      if (results.length === 0) setError("No se encontraron empresas candidatas con esos términos y ubicación.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al buscar.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleImport() {
    const chosenIndices = selected;
    const chosen = candidates.filter((_, i) => chosenIndices.has(i));
    if (chosen.length === 0) return;
    setImporting(true);
    try {
      const result = await importLeadsAction(chosen);
      setImportResult(result);
      // Drop every candidate that was part of this import attempt — created
      // ones are now in the CRM, skipped ones were already duplicates either
      // way, so re-offering them next round serves no purpose.
      setCandidates((prev) => prev.filter((_, i) => !chosenIndices.has(i)));
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-medium text-slate-800">Buscar</h2>
          <p className="text-xs text-slate-500 mt-1">
            Añade los términos que describan el tipo de empresa que buscas y la ubicación. La IA busca en internet
            empresas reales que encajen y te las trae para revisar antes de añadirlas al CRM.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-slate-600">Términos de búsqueda</span>
          <TermChips terms={terms} onRemove={(t) => setTerms((prev) => prev.filter((x) => x !== t))} />
          <div className="flex gap-2">
            <input
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTerm();
                }
              }}
              placeholder="Ej: mantenimiento de automatismos"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addTerm}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              + Añadir término
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Ubicación (ciudad, provincia o isla)</span>
            <input
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej: Ibiza y Palma de Mallorca"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Nº máximo de resultados</span>
            <input
              type="number"
              min={1}
              max={30}
              value={maxResultados}
              onChange={(e) => setMaxResultados(Number(e.target.value) || 15)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || terms.length === 0 || !ubicacion.trim()}
          className="self-start rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Buscando… (puede tardar 20-40s)" : "Buscar empresas"}
        </button>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      </section>

      {searched && (candidates.length > 0 || importResult) && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
          {candidates.length > 0 && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-medium text-slate-800">
                  Resultados <span className="text-slate-400 font-normal">· {candidates.length} candidata(s)</span>
                </h2>
                <div className="flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(candidates.map((_, i) => i)))}
                    className="text-blue-600 hover:underline"
                  >
                    Marcar todas
                  </button>
                  <button type="button" onClick={() => setSelected(new Set())} className="text-slate-500 hover:underline">
                    Ninguna
                  </button>
                </div>
              </div>

              <ul className="flex flex-col gap-2">
                {candidates.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 hover:border-blue-200"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleSelected(i)}
                      className="mt-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800">{c.empresa}</div>
                      <div className="text-xs text-slate-500">
                        {[c.direccion, c.codigoPostal, c.municipio, c.provincia].filter(Boolean).join(", ") ||
                          "Sin ubicación"}
                        {c.web ? ` · ${c.web}` : ""}
                        {c.telefono ? ` · ${c.telefono}` : ""}
                        {c.email ? ` · ${c.email}` : ""}
                      </div>
                      {c.clasificacion && (
                        <span className="inline-block mt-1 text-[10px] uppercase tracking-wide rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                          {c.clasificacion}
                        </span>
                      )}
                      {c.justificacion && <p className="text-xs text-slate-500 mt-1">{c.justificacion}</p>}
                    </div>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="self-start rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {importing ? "Añadiendo…" : `Añadir ${selected.size} seleccionada(s) al CRM`}
              </button>
            </>
          )}

          {importResult && (
            <div className="text-sm rounded-lg bg-emerald-50 text-emerald-800 px-3 py-2 flex flex-col gap-1">
              <span>
                ✓ {importResult.created} empresa(s) añadida(s){" "}
                <Link href="/empresas" className="underline">
                  Ver en Empresas →
                </Link>
              </span>
              {importResult.skipped > 0 && (
                <span className="text-amber-700">
                  {importResult.skipped} ya existían y se han omitido: {importResult.skippedNames.join(", ")}
                </span>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
