import type { ReactNode } from "react";
import type { CompanyNote } from "@/lib/notes";
import type { PipelineAction } from "@/lib/types";
import { formatDateTime } from "@/lib/formatDate";
import { TrashIcon } from "../icons";
import { createNoteAction, deleteNoteAction, updateNoteAction } from "./notesActions";
import { TIPO_STYLES } from "./PipelineSection";
import NoteTextarea from "./NoteTextarea";

// Notes are stored as plain text with a **bold**/*italic*/"- " markdown-lite
// syntax (see NoteTextarea) rather than HTML, so this only ever produces
// text nodes and <strong>/<em>/<ul> elements — never dangerouslySetInnerHTML,
// so there's no way for a note's content to inject markup.
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderNoteBody(text: string): ReactNode {
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5">
        {listBuffer.map((l, i) => (
          <li key={i}>{renderInline(l)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  text.split("\n").forEach((line, i) => {
    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
      return;
    }
    flushList(`list-${i}`);
    blocks.push(<p key={`line-${i}`}>{line === "" ? " " : renderInline(line)}</p>);
  });
  flushList("list-end");

  return blocks;
}

function NoteForm({ companyId, note }: { companyId: number; note?: CompanyNote }) {
  return (
    <form action={note ? updateNoteAction : createNoteAction} className="flex flex-col gap-2">
      <input type="hidden" name="companyId" value={companyId} />
      {note && <input type="hidden" name="id" value={note.id} />}
      <NoteTextarea name="texto" defaultValue={note?.texto} placeholder="Añadir una nota..." />
      <button
        type="submit"
        className="self-start rounded-lg bg-blue-600 text-white text-sm px-4 py-2 hover:bg-blue-700"
      >
        {note ? "Guardar nota" : "Añadir nota"}
      </button>
    </form>
  );
}

export default function NotesSection({
  companyId,
  notes,
  recentActions,
  timezone,
}: {
  companyId: number;
  notes: CompanyNote[];
  recentActions: PipelineAction[];
  timezone: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3 min-w-0">
          <h2 className="font-medium text-slate-800">Notas</h2>
          <NoteForm companyId={companyId} />
          <p className="text-xs text-slate-400 -mt-1">
            B / I aplican negrita/cursiva; ≡ convierte las líneas seleccionadas en lista con guiones.
          </p>
          {notes.length > 0 ? (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-slate-700 flex flex-col gap-1">{renderNoteBody(n.texto)}</div>
                    <form action={deleteNoteAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <input type="hidden" name="companyId" value={companyId} />
                      <button
                        type="submit"
                        title="Eliminar nota"
                        aria-label="Eliminar nota"
                        className="text-red-400 hover:text-red-600 shrink-0"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{formatDateTime(n.createdAt, timezone)}</div>
                  {/* Keyed on texto so a successful save (which changes n.texto) makes React
                      remount this <details> instead of reusing the open one — otherwise the
                      native open/closed state survives the post-save refresh and the editor
                      looks like it never closed. */}
                  <details key={n.texto} className="mt-2 text-sm">
                    <summary className="cursor-pointer text-blue-600 hover:underline">Editar</summary>
                    <div className="mt-2">
                      <NoteForm companyId={companyId} note={n} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Sin notas todavía.</p>
          )}
        </div>

        <div className="flex flex-col gap-3 min-w-0 sm:border-l sm:border-slate-100 sm:pl-6">
          <h2 className="font-medium text-slate-800">Últimas acciones realizadas</h2>
          {recentActions.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {recentActions.map((a) => (
                <li key={a.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0 ${
                        TIPO_STYLES[a.tipo] ?? TIPO_STYLES.Otro
                      }`}
                    >
                      {a.tipo}
                    </span>
                    <span className="text-slate-800">{a.titulo}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {a.completedAt && formatDateTime(a.completedAt, timezone)}
                    {a.notas && ` · ${a.notas}`}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Sin acciones completadas todavía.</p>
          )}
        </div>
      </div>
    </section>
  );
}
