"use server";

import { revalidatePath } from "next/cache";
import { getCompany, updateCompany } from "@/lib/companies";
import { estimateLeadScore } from "@/lib/ai/leadScoring";
import { checkRateLimit } from "@/lib/rateLimit";
import type { CompanyInput } from "@/lib/types";

export async function estimateScoreAction(formData: FormData) {
  const companyId = Number(formData.get("companyId"));
  const company = await getCompany(companyId);
  if (!company) return;

  // Never silently overwrite a valoración the sales rep already confirmed manually.
  if (company.valoracion !== null && !company.scoreEstimadoIa) return;

  const allowed = await checkRateLimit(`estimate-score:${companyId}`, 30);
  if (!allowed) return;

  try {
    const estimate = await estimateLeadScore(company);
    const patch: Partial<CompanyInput> = { valoracion: estimate.valoracion, scoreEstimadoIa: true };
    if (estimate.resumen) {
      patch.observaciones = company.observaciones
        ? `${company.observaciones} | Estimación IA: ${estimate.resumen}`
        : `Estimación IA: ${estimate.resumen}`;
    }
    await updateCompany(companyId, patch);
  } catch {
    // best-effort; leave the record untouched if the estimate fails
  }

  revalidatePath(`/empresas/${companyId}`);
}
