"use client";

import { deleteCompanyAction } from "./actions";

export default function DeleteButton({ id }: { id: number }) {
  return (
    <form
      action={deleteCompanyAction}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar esta empresa? Esta acción no se puede deshacer.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg border border-red-200 text-red-600 text-sm px-4 py-2 hover:bg-red-50">
        Eliminar empresa
      </button>
    </form>
  );
}
