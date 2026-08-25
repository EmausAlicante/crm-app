import { anthropicConfigured } from "@/lib/ai/anthropic";
import ProspeccionClient from "./ProspeccionClient";

export const dynamic = "force-dynamic";

export default function ProspeccionPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Prospección de leads</h1>
        <p className="text-sm text-slate-500 mt-1">
          Busca empresas nuevas por zona y tipo de negocio, revisa los resultados y añade las que te interesen
          directamente al CRM.
        </p>
      </div>

      {!anthropicConfigured ? (
        <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
          Falta configurar ANTHROPIC_API_KEY para poder buscar. Añádela a las variables de entorno.
        </p>
      ) : (
        <ProspeccionClient />
      )}
    </div>
  );
}
