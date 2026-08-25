"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { IMPORT_FIELDS, type ImportField, type ImportPreviewItem, type ParsedFile } from "@/lib/importFields";
import { commitImportAction, parseFileAction, previewImportAction } from "../importActions";

type Step = "upload" | "map" | "preview" | "done";

function guessField(header: string): ImportField | "__ignore__" {
  const h = header.toLowerCase();
  if (/empresa|nombre/.test(h) && !/comercial|contacto/.test(h)) return "empresa";
  if (/comercial/.test(h)) return "nombreComercial";
  if (/direcci|domicilio/.test(h)) return "direccion";
  if (/municipio|ciudad|poblaci/.test(h)) return "municipio";
  if (/postal|c\.?p\.?/.test(h)) return "codigoPostal";
  if (/provincia/.test(h)) return "provincia";
  if (/web|sitio/.test(h)) return "web";
  if (/email|correo/.test(h)) return "email";
  if (/tel[eé]fono|m[oó]vil|contacto.*tel/.test(h)) return "telefono";
  if (/contacto|persona/.test(h)) return "contacto";
  if (/cargo|puesto/.test(h)) return "cargo";
  if (/categor|clasificaci|tipo/.test(h)) return "clasificacion";
  if (/nota|observ|comentario/.test(h)) return "observaciones";
  return "__ignore__";
}

export default function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<ImportPreviewItem[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [overwriteConflicts, setOverwriteConflicts] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      try {
        const result = await parseFileAction(formData);
        setParsed(result);
        const initialMapping: Record<number, string> = {};
        result.headers.forEach((h, i) => {
          initialMapping[i] = guessField(h);
        });
        setMapping(initialMapping);
        setStep("map");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
      }
    });
  }

  function handleBuildPreview() {
    if (!parsed) return;
    const hasEmpresa = Object.values(mapping).includes("empresa");
    if (!hasEmpresa) {
      setError("Tienes que asignar una columna al campo Empresa.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await previewImportAction(parsed.rows, mapping);
      setPreview(result);
      setExcluded(new Set(result.filter((r) => r.action === "skip").map((r) => r.rowIndex)));
      setStep("preview");
    });
  }

  function handleConfirm() {
    const items = preview.filter((p) => !excluded.has(p.rowIndex));
    startTransition(async () => {
      const res = await commitImportAction(items, overwriteConflicts);
      setResult(res);
      setStep("done");
    });
  }

  function toggleExcluded(rowIndex: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  const included = preview.filter((p) => !excluded.has(p.rowIndex));
  const nNew = included.filter((p) => p.action === "new").length;
  const nUpdate = included.filter((p) => p.action === "update").length;
  const nConflicts = included.reduce((sum, p) => sum + p.conflicts.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

      {step === "upload" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-3">
          <h2 className="font-medium">1. Sube tu archivo</h2>
          <p className="text-sm text-slate-500">
            Admite Excel (.xlsx) o CSV. Puede tener las columnas que tenga — en el siguiente paso indicas qué es cada una.
          </p>
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            disabled={isPending}
            className="text-sm mt-2"
          />
          {isPending && <p className="text-sm text-slate-400">Leyendo archivo…</p>}
        </section>
      )}

      {step === "map" && parsed && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="font-medium">2. Indica qué es cada columna</h2>
          <p className="text-sm text-slate-500">
            {parsed.rows.length} fila(s) detectadas. Deja &quot;Ignorar&quot; en las columnas que no te interesen.
          </p>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4">Columna del archivo</th>
                  <th className="py-2 pr-4">Ejemplo</th>
                  <th className="py-2">Se importa como</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.headers.map((h, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 font-medium text-slate-800">{h}</td>
                    <td className="py-2 pr-4 text-slate-400 truncate max-w-[220px]">
                      {parsed.rows[0]?.[i] || "—"}
                    </td>
                    <td className="py-2">
                      <select
                        value={mapping[i] ?? "__ignore__"}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [i]: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="__ignore__">Ignorar</option>
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                            {f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleBuildPreview}
              disabled={isPending}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Comprobando duplicados…" : "Continuar →"}
            </button>
            <button onClick={() => setStep("upload")} className="text-sm text-slate-500 hover:underline">
              ← Empezar de nuevo
            </button>
          </div>
        </section>
      )}

      {step === "preview" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="font-medium">3. Revisa antes de importar</h2>
          <p className="text-sm text-slate-500">
            {nNew} empresa(s) nueva(s), {nUpdate} se actualizarán. Desmarca cualquier fila que no quieras importar.
          </p>

          {nConflicts > 0 && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={overwriteConflicts}
                onChange={(e) => setOverwriteConflicts(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-amber-800">
                  {nConflicts} dato(s) del archivo son distintos de lo que ya tienes guardado.
                </span>{" "}
                <span className="text-amber-700">
                  Márcalo para que el archivo sobrescriba esos datos. Si lo dejas sin marcar (recomendado por
                  defecto), no se toca nada de lo que ya tenías — mira el detalle en cada fila con conflictos.
                </span>
              </span>
            </label>
          )}

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="text-sm w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-2 w-8"></th>
                  <th className="py-2 pr-4">Empresa</th>
                  <th className="py-2 pr-4">Municipio</th>
                  <th className="py-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((item) => (
                  <tr key={item.rowIndex} className={excluded.has(item.rowIndex) ? "opacity-40" : ""}>
                    <td className="py-2 pr-2 align-top">
                      <input
                        type="checkbox"
                        checked={!excluded.has(item.rowIndex)}
                        onChange={() => toggleExcluded(item.rowIndex)}
                        disabled={item.action === "skip"}
                      />
                    </td>
                    <td className="py-2 pr-4 font-medium text-slate-800 align-top">{item.data.empresa || "—"}</td>
                    <td className="py-2 pr-4 text-slate-500 align-top">{item.data.municipio || "—"}</td>
                    <td className="py-2">
                      {item.action === "new" && (
                        <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">Nueva</span>
                      )}
                      {item.action === "update" && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 w-fit">
                            Actualiza &quot;{item.matchedName}&quot; ({item.reason})
                          </span>
                          {item.conflicts.length > 0 && (
                            <details>
                              <summary className="cursor-pointer text-xs text-slate-500 hover:underline">
                                {item.conflicts.length} dato(s) en conflicto
                              </summary>
                              <ul className="mt-1 text-xs text-slate-500 flex flex-col gap-0.5">
                                {item.conflicts.map((c) => (
                                  <li key={c.field}>
                                    <span className="font-medium">{c.label}:</span> &quot;{c.current}&quot; →{" "}
                                    <span className={overwriteConflicts ? "text-amber-700 font-medium" : "line-through"}>
                                      &quot;{c.incoming}&quot;
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      )}
                      {item.action === "skip" && (
                        <span className="text-xs rounded-full bg-slate-100 text-slate-500 px-2 py-0.5">
                          Sin nombre — {item.reason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleConfirm}
              disabled={isPending || included.length === 0}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Importando…" : `Importar ${included.length} empresa(s) →`}
            </button>
            <button onClick={() => setStep("map")} className="text-sm text-slate-500 hover:underline">
              ← Volver a mapear columnas
            </button>
          </div>
        </section>
      )}

      {step === "done" && result && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 flex flex-col gap-3">
          <h2 className="font-medium text-emerald-800">Importación completada</h2>
          <p className="text-sm text-emerald-700">
            {result.created} empresa(s) nueva(s) creada(s) · {result.updated} empresa(s) existente(s) enriquecida(s).
          </p>
          <div className="flex items-center gap-3 mt-1">
            <Link href="/empresas" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
              Ver Empresas
            </Link>
            <button
              onClick={() => {
                setStep("upload");
                setParsed(null);
                setPreview([]);
                setResult(null);
              }}
              className="text-sm text-slate-500 hover:underline"
            >
              Importar otro archivo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
