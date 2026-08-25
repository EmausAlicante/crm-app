import Link from "next/link";
import { listDocuments } from "@/lib/documents";
import { blobConfigured } from "@/lib/blob";
import { DOCUMENT_CATEGORIAS } from "@/lib/types";
import { DownloadIcon, TrashIcon } from "../icons";
import { deleteDocumentAction } from "./actions";
import UploadDocumentForm from "./UploadDocumentForm";

export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

function isImage(nombreArchivo: string | null): boolean {
  if (!nombreArchivo) return false;
  const lower = nombreArchivo.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const categoria = typeof sp.categoria === "string" ? sp.categoria : "";

  const documents = await listDocuments(
    categoria && (DOCUMENT_CATEGORIAS as readonly string[]).includes(categoria) ? (categoria as (typeof DOCUMENT_CATEGORIAS)[number]) : undefined
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Documentos</h1>
        <p className="text-sm text-slate-500 mt-1">Catálogos, logos, imágenes y otros archivos compartidos.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="font-medium text-slate-800">Subir documento</h2>
        {blobConfigured ? (
          <UploadDocumentForm />
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
            Almacenamiento de archivos no configurado todavía. Activa Vercel Blob y añade BLOB_READ_WRITE_TOKEN para
            poder subir documentos.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/documentos"
          className={`text-sm rounded-lg px-3 py-1.5 border ${!categoria ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:bg-slate-50"}`}
        >
          Todos
        </Link>
        {DOCUMENT_CATEGORIAS.map((c) => (
          <Link
            key={c}
            href={`/documentos?categoria=${encodeURIComponent(c)}`}
            className={`text-sm rounded-lg px-3 py-1.5 border ${categoria === c ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:bg-slate-50"}`}
          >
            {c}
          </Link>
        ))}
      </div>

      {documents.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {documents.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2">
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-28 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden"
              >
                {isImage(d.nombreArchivo) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.url} alt={d.nombre} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-3xl">📄</span>
                )}
              </a>
              <div className="text-sm font-medium text-slate-800 truncate" title={d.nombre}>
                {d.nombre}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>{d.categoria}</span>
                <span>{formatSize(d.tamanoBytes)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Descargar"
                  aria-label="Descargar"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  Descargar
                </a>
                <form action={deleteDocumentAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" title="Eliminar" aria-label="Eliminar documento" className="text-red-400 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          No hay documentos {categoria ? `en "${categoria}"` : "todavía"}.
        </div>
      )}
    </div>
  );
}
