"use server";

import { revalidatePath } from "next/cache";
import { getCompany, updateCompany } from "@/lib/companies";
import { calculateNetelScore, netelPrioridadFromScore } from "@/lib/constants";
import { MARCAS } from "@/lib/constants";

// Recalcula el Score NETEL y la prioridad a partir de lo que ya hay en la
// ficha (especialización, marcas, clasificación, sub-scores) — no pide datos
// nuevos, solo recombina los existentes con los pesos actuales de
// NETEL_SCORE_PESOS (ver lib/constants.ts).
export async function recalcularNetelScoreAction(formData: FormData) {
  const companyId = Number(formData.get("companyId"));
  const company = await getCompany(companyId);
  if (!company) return;

  const marcasActivas = MARCAS.filter(({ key }) => key !== "marcaOtras" && company[key]).length;
  const score = calculateNetelScore(company, marcasActivas);
  await updateCompany(companyId, { netelScore: score, netelPrioridad: netelPrioridadFromScore(score) });

  revalidatePath(`/empresas/${companyId}`);
}
