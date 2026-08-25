"use server";

import { revalidatePath } from "next/cache";
import { createBillingPlan, deleteBillingPlan, setBillingPlanActivo, setChargeEstado } from "@/lib/billing";
import { BILLING_FRECUENCIAS, CHARGE_ESTADOS, type BillingFrecuencia, type ChargeEstado } from "@/lib/types";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createBillingPlanAction(formData: FormData) {
  const companyId = Number(formData.get("companyId"));
  const concepto = str(formData, "concepto");
  const importe = Number(formData.get("importe"));
  const frecuenciaRaw = str(formData, "frecuencia");
  const fechaInicio = str(formData, "fechaInicio");
  const fechaFin = str(formData, "fechaFin");

  if (!companyId || !concepto || !Number.isFinite(importe) || !fechaInicio) return;
  const frecuencia = (BILLING_FRECUENCIAS as readonly string[]).includes(frecuenciaRaw ?? "")
    ? (frecuenciaRaw as BillingFrecuencia)
    : "Mensual";

  await createBillingPlan({ companyId, concepto, importe, frecuencia, fechaInicio, fechaFin });
  revalidatePath("/facturacion");
}

export async function togglePlanActivoAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await setBillingPlanActivo(id, activo);
  revalidatePath("/facturacion");
}

export async function deletePlanAction(formData: FormData) {
  const id = Number(formData.get("id"));
  await deleteBillingPlan(id);
  revalidatePath("/facturacion");
}

export async function setChargeEstadoAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const estado = formData.get("estado");
  if (typeof estado !== "string" || !(CHARGE_ESTADOS as readonly string[]).includes(estado)) return;
  await setChargeEstado(id, estado as ChargeEstado);
  revalidatePath("/facturacion");
}
