"use server";

import { revalidatePath } from "next/cache";
import {
  listIncompleteCompanies,
  countIncompleteCompanies,
  getCompany,
  enrichCompanyFromImport,
  updateCompany,
} from "@/lib/companies";
import { enrichCompanyContactData } from "@/lib/ai/leadEnrichment";
import { estimateLeadScore } from "@/lib/ai/leadScoring";
import { calculateNetelScore, netelPrioridadFromScore, MARCAS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rateLimit";
import { insertSaneamientoLog } from "@/lib/saneamientoLog";

export type SaneamientoItemResult = {
  id: number;
  empresa: string;
  investigada: boolean;
  valorada: boolean;
  error: string | null;
};

export type SaneamientoLoteResult = {
  procesadas: SaneamientoItemResult[];
  pendientesRestantes: number;
};

// Procesa hasta `batchSize` leads de la cola de incompletos: si faltan datos de
// contacto, lanza el agente de investigación y rellena solo los huecos (nunca
// pisa lo que el comercial ya haya escrito a mano); si falta valoración, la
// estima; y al final recalcula el Score NETEL con los datos que haya en ese momento.
export async function sanearLoteAction(batchSize: number): Promise<SaneamientoLoteResult> {
  const size = Math.max(1, Math.min(batchSize, 15));
  const allowed = await checkRateLimit("saneamiento-lote", 20);
  if (!allowed) throw new Error("Espera unos segundos antes de lanzar otro lote.");

  const lote = await listIncompleteCompanies(size);
  const procesadas: SaneamientoItemResult[] = [];

  for (const item of lote) {
    const result: SaneamientoItemResult = { id: item.id, empresa: item.empresa, investigada: false, valorada: false, error: null };
    try {
      const company = await getCompany(item.id);
      if (!company) {
        result.error = "Ya no existe (¿borrada mientras tanto?)";
        procesadas.push(result);
        continue;
      }

      // 1) Rellenar huecos de contacto, si faltan.
      if (item.faltaWeb || item.faltaTelefono || item.faltaDireccion) {
        const found = await enrichCompanyContactData({
          empresa: company.empresa,
          web: company.web,
          telefono: company.telefono,
          email: company.email,
          direccion: company.direccion,
          codigoPostal: company.codigoPostal,
          municipio: company.municipio,
          provincia: company.provincia,
        });
        await enrichCompanyFromImport(item.id, {
          web: found.web ?? undefined,
          telefono: found.telefono ?? undefined,
          email: found.email ?? undefined,
          direccion: found.direccion ?? undefined,
          codigoPostal: found.codigoPostal ?? undefined,
          municipio: found.municipio ?? undefined,
          provincia: found.provincia ?? undefined,
        });
        result.investigada = true;
      }

      // 2) Releer con lo que se acaba de rellenar, para valorar con el máximo contexto posible.
      const refreshed = (await getCompany(item.id)) ?? company;

      // 3) Estimar valoración si sigue sin tenerla (nunca pisa una ya puesta a mano).
      if (refreshed.valoracion === null) {
        const estimate = await estimateLeadScore(refreshed);
        const observaciones = refreshed.observaciones
          ? `${refreshed.observaciones} | Estimación IA (saneamiento): ${estimate.resumen}`
          : `Estimación IA (saneamiento): ${estimate.resumen}`;
        await updateCompany(item.id, { valoracion: estimate.valoracion, scoreEstimadoIa: true, observaciones });
        result.valorada = true;
      }

      // 4) Recalcular Score NETEL con lo que haya ahora mismo (especialización, marcas, clasificación).
      const finalCompany = (await getCompany(item.id)) ?? refreshed;
      const marcasActivas = MARCAS.filter(({ key }) => key !== "marcaOtras" && finalCompany[key]).length;
      const netelScore = calculateNetelScore(finalCompany, marcasActivas);
      await updateCompany(item.id, { netelScore, netelPrioridad: netelPrioridadFromScore(netelScore) });
    } catch (e) {
      result.error = e instanceof Error ? e.message : "Error desconocido";
    }
    procesadas.push(result);
    await insertSaneamientoLog({
      companyId: result.id,
      empresa: result.empresa,
      investigada: result.investigada,
      valorada: result.valorada,
      error: result.error,
    });
  }

  revalidatePath("/saneamiento");
  revalidatePath("/empresas");
  revalidatePath("/dashboard");

  const pendientesRestantes = await countIncompleteCompanies();
  return { procesadas, pendientesRestantes };
}
