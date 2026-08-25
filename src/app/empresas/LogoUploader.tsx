"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { deleteLogoAction, saveLogoUrlAction } from "./mediaActions";

export default function LogoUploader({
  companyId,
  logoUrl,
  blobConfigured,
}: {
  companyId: number;
  logoUrl: string | null;
  blobConfigured: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const blob = await upload(`logos/${companyId}/${Date.now()}-${safeName}`, file, {
          access: "public",
          handleUploadUrl: "/api/documentos/upload",
        });
        await saveLogoUrlAction(companyId, blob.url);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir el logo.");
      }
    });
  }

  return (
    <div className="relative h-24 w-24 shrink-0">
      <label
        className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border bg-white text-center text-xs text-slate-300 ${
          blobConfigured ? "cursor-pointer border-slate-200 hover:border-blue-300 hover:opacity-90" : "border-dashed border-slate-200"
        }`}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
        ) : (
          <span>{isPending ? "Subiendo…" : blobConfigured ? "Pulsa para subir logo" : "Sin logo"}</span>
        )}
        {blobConfigured && (
          <input type="file" accept="image/*" className="hidden" disabled={isPending} onChange={handleChange} />
        )}
      </label>
      {error && <p className="absolute -bottom-5 left-0 text-[10px] text-red-600 whitespace-nowrap">{error}</p>}

      {logoUrl && blobConfigured && (
        <form action={deleteLogoAction} className="absolute -top-2 -right-2">
          <input type="hidden" name="companyId" value={companyId} />
          <button
            type="submit"
            title="Eliminar logo"
            aria-label="Eliminar logo"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-sm leading-none text-slate-500 shadow-sm hover:border-red-300 hover:text-red-600 hover:bg-red-50"
          >
            ×
          </button>
        </form>
      )}
    </div>
  );
}
