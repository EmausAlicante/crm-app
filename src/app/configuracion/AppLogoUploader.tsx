"use client";

import { useRef } from "react";
import { TrashIcon } from "../icons";
import { deleteAppLogoAction, uploadAppLogoAction } from "./settingsActions";

export default function AppLogoUploader({ logoUrl, blobConfigured }: { logoUrl: string | null; blobConfigured: boolean }) {
  const uploadFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        <form ref={uploadFormRef} action={uploadAppLogoAction}>
          <label
            className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-white text-center text-xs text-slate-300 ${
              blobConfigured ? "cursor-pointer border-slate-200 hover:border-blue-300 hover:opacity-90" : "border-dashed border-slate-200"
            }`}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <span>{blobConfigured ? "Pulsa para subir logo" : "Sin logo"}</span>
            )}
            {blobConfigured && (
              <input
                type="file"
                name="logo"
                accept="image/*"
                className="hidden"
                onChange={() => uploadFormRef.current?.requestSubmit()}
              />
            )}
          </label>
        </form>
      </div>
      {logoUrl && blobConfigured && (
        <form action={deleteAppLogoAction}>
          <button
            type="submit"
            title="Eliminar logo"
            aria-label="Eliminar logo"
            className="flex items-center gap-1.5 text-xs text-red-500 hover:underline"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Eliminar logo
          </button>
        </form>
      )}
    </div>
  );
}
