import { TIPOS_ACCION } from "@/lib/types";
import { mergeClasificacionTags, updateCompany } from "@/lib/companies";
import { listPipelineEstadoNames } from "@/lib/pipelineEstados";
import { createAction } from "@/lib/pipeline";
import type { MeetingAnalysis } from "./meetingAnalysis";

// Writes the parts of a meeting analysis that represent real CRM state changes:
// pipeline stage, classification tags, and follow-up actions. The rest of the
// analysis (summary, objections, interests, commitments) is just displayed.
export async function applyMeetingAnalysis(companyId: number, analysis: MeetingAnalysis): Promise<void> {
  const estados = await listPipelineEstadoNames();
  if (estados.includes(analysis.etapaRecomendada)) {
    await updateCompany(companyId, { estado: analysis.etapaRecomendada });
  }

  if (analysis.etiquetasSugeridas?.length) {
    await mergeClasificacionTags(companyId, analysis.etiquetasSugeridas);
  }

  for (const accion of analysis.proximasAcciones ?? []) {
    const tipo = (TIPOS_ACCION as readonly string[]).includes(accion.tipo) ? accion.tipo : "Seguimiento";
    await createAction({
      companyId,
      tipo,
      titulo: accion.titulo,
      fechaPrevista: accion.fecha,
      horaPrevista: null,
      completada: false,
      notas: "Sugerida automáticamente por el análisis de reunión.",
      resultadoLlamada: null,
      motivoRechazo: null,
    });
  }
}
