import type { MeetingAnalysis } from "@/lib/ai/meetingAnalysis";

export default function AnalysisCard({ analysis }: { analysis: MeetingAnalysis }) {
  return (
    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 font-medium">
          Etapa sugerida: {analysis.etapaRecomendada}
        </span>
        {analysis.etiquetasSugeridas?.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-200 text-slate-600 px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>
      <p className="text-slate-700">{analysis.resumenEjecutivo}</p>

      {analysis.puntosClave?.length > 0 && (
        <div>
          <div className="font-medium text-slate-600">Puntos clave</div>
          <ul className="list-disc list-inside text-slate-500">
            {analysis.puntosClave.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.compromisos?.length > 0 && (
        <div>
          <div className="font-medium text-slate-600">Compromisos</div>
          <ul className="list-disc list-inside text-slate-500">
            {analysis.compromisos.map((c, i) => (
              <li key={i}>
                {c.descripcion}
                {c.responsable && ` — ${c.responsable}`}
                {c.fecha && ` (${c.fecha})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.objeciones?.length > 0 && (
        <div>
          <div className="font-medium text-slate-600">Objeciones</div>
          <ul className="list-disc list-inside text-slate-500">
            {analysis.objeciones.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.interesesCliente?.length > 0 && (
        <div>
          <div className="font-medium text-slate-600">Intereses del cliente</div>
          <ul className="list-disc list-inside text-slate-500">
            {analysis.interesesCliente.map((int, i) => (
              <li key={i}>{int}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.proximasAcciones?.length > 0 && (
        <div>
          <div className="font-medium text-slate-600">Próximas acciones (ya añadidas al pipeline)</div>
          <ul className="list-disc list-inside text-slate-500">
            {analysis.proximasAcciones.map((a, i) => (
              <li key={i}>
                [{a.tipo}] {a.titulo}
                {a.fecha && ` (${a.fecha})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
