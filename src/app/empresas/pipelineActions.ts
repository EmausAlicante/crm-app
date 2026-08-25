"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAction, deleteAction, listDueActionsNow, setActionCompleted, updateAction } from "@/lib/pipeline";
import { advanceEstadoOnContact } from "@/lib/companies";
import { logActionResultAction } from "./mediaActions";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createActionAction(formData: FormData) {
  const companyId = Number(formData.get("companyId"));
  await createAction({
    companyId,
    tipo: str(formData, "tipo") ?? "Seguimiento",
    titulo: str(formData, "titulo") ?? "",
    fechaPrevista: str(formData, "fechaPrevista"),
    horaPrevista: str(formData, "horaPrevista"),
    completada: false,
    notas: str(formData, "notas"),
    resultadoLlamada: str(formData, "resultadoLlamada"),
    motivoRechazo: str(formData, "motivoRechazo"),
  });
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function updateActionAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  await updateAction(id, {
    tipo: str(formData, "tipo") ?? "Seguimiento",
    titulo: str(formData, "titulo") ?? "",
    fechaPrevista: str(formData, "fechaPrevista"),
    horaPrevista: str(formData, "horaPrevista"),
    notas: str(formData, "notas"),
    resultadoLlamada: str(formData, "resultadoLlamada"),
    motivoRechazo: str(formData, "motivoRechazo"),
  });
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

// Called directly (not via a <form>) by the header's due-actions bell/popup,
// which polls on an interval — see DueActionsBell.tsx.
export async function listDueActionsNowAction(timezone: string) {
  return listDueActionsNow(timezone);
}

export async function toggleActionAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  const completada = formData.get("completada") === "true";
  const resultado = str(formData, "resultado");
  const titulo = str(formData, "titulo") ?? "Acción";

  await setActionCompleted(id, completada);
  if (completada) await advanceEstadoOnContact(companyId);

  let analisisId: number | null = null;
  if (completada && resultado) {
    analisisId = await logActionResultAction(companyId, titulo, resultado);
  }

  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/empresas");
  revalidatePath("/dashboard");
  revalidatePath("/rutas");
  revalidatePath("/", "layout");

  // Marking an action done is the moment to ask "what's next?" — redirect back
  // to the Comercial tab with either the AI's suggested next step (if the user
  // logged what happened) or a plain dismissible prompt otherwise.
  if (completada) {
    const params = new URLSearchParams({ tab: "comercial", siguiente: "1" });
    if (analisisId) params.set("analisisId", String(analisisId));
    redirect(`/empresas/${companyId}?${params.toString()}`);
  }
}

export async function deleteActionAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  await deleteAction(id);
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}
