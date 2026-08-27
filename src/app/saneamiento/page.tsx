import { anthropicConfigured } from "@/lib/ai/anthropic";
import { countIncompleteCompanies } from "@/lib/companies";
import SaneamientoClient from "./SaneamientoClient";

export const dynamic = "force-dynamic";

export default async function SaneamientoPage() {
  const pendientes = await countIncompleteCompanies();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Saneamiento de leads</h1>
        <p className="text-sm text-slate-500 mt-1">
          Antes de automatizar hacia delante, poner en orden lo que ya está metido: leads sin web, teléfono,
          dirección o valoración. Cada lote investiga los huecos, valora si falta, y recalcula el Score NETEL.
        </p>
      </div>

      {!anthropicConfigured ? (
        <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
          Falta configurar ANTHROPIC_API_KEY para poder investigar y valorar. Añádela a las variables de entorno.
        </p>
      ) : (
        <SaneamientoClient pendientesInicial={pendientes} />
      )}
    </div>
  );
}
