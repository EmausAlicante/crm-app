import {
  ESPECIALIZACIONES,
  JORNADAS,
  MARCAS,
  NETEL_ESTRATEGIAS,
  NETEL_PRIORIDADES,
  NETEL_PRIORIDAD_STYLES,
  NIVELES_INVESTIGACION,
  SCORE_FIELDS,
  ZONAS,
} from "@/lib/constants";
import type { Company } from "@/lib/types";
import { anthropicConfigured } from "@/lib/ai/anthropic";
import { COMPANY_FORM_ID, Checkbox, Field, Section, TextArea } from "./formFields";
import {
  deleteDocumentoBancarioAction,
  deleteLopdDocumentoAction,
  saveDocumentoBancarioUrlAction,
  saveLopdDocumentoUrlAction,
} from "./mediaActions";
import { estimateScoreAction } from "./scoreActions";
import { recalcularNetelScoreAction } from "./netelActions";
import DocumentUploader from "./DocumentUploader";
import ClasificacionTagPicker from "./ClasificacionTagPicker";

export function DatosGeneralesSection({ company }: { company?: Company }) {
  return (
    <Section title="Datos generales">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Empresa *" name="empresa" defaultValue={company?.empresa} />
        <Field label="Nombre comercial" name="nombreComercial" defaultValue={company?.nombreComercial} />
        <Field label="Dirección" name="direccion" defaultValue={company?.direccion} />
        <Field label="Municipio" name="municipio" defaultValue={company?.municipio} />
        <Field label="Código postal" name="codigoPostal" defaultValue={company?.codigoPostal} />
        <Field label="Provincia" name="provincia" defaultValue={company?.provincia ?? "Madrid"} />
        <Field label="Web" name="web" defaultValue={company?.web} />
        <Field label="Email" name="email" type="email" defaultValue={company?.email} />
        <Field label="Teléfono" name="telefono" defaultValue={company?.telefono} />
        <Field label="WhatsApp" name="whatsapp" defaultValue={company?.whatsapp} placeholder="Ej: +34 600 000 000" />
        <Field label="Persona de contacto" name="contacto" defaultValue={company?.contacto} />
        <Field label="Cargo" name="cargo" defaultValue={company?.cargo} />
      </div>
    </Section>
  );
}

export function ClasificacionSection({
  company,
  existingTags = [],
}: {
  company?: Company;
  existingTags?: string[];
}) {
  return (
    <Section title="Clasificación">
      <ClasificacionTagPicker defaultValue={company?.clasificacion} suggestions={existingTags} />
      <div>
        <div className="text-sm text-slate-600 mb-2">Especialización</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ESPECIALIZACIONES.map(({ key, label }) => (
            <Checkbox key={key} label={label} name={key} defaultChecked={company?.[key] ?? false} />
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm text-slate-600 mb-2">Marcas con las que trabaja</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MARCAS.map(({ key, label }) => (
            <Checkbox key={key} label={label} name={key} defaultChecked={company?.[key] ?? false} />
          ))}
        </div>
      </div>
    </Section>
  );
}

const VALORACION_OPTIONS = Array.from({ length: 11 }, (_, i) => i / 2); // 0, 0.5, 1, ..., 5

function valoracionLabel(v: number): string {
  const full = Math.round(v);
  return `${"★".repeat(full)}${"☆".repeat(5 - full)} (${v.toFixed(1)})`;
}

export function PuntuacionSection({ company, companyId }: { company?: Company; companyId?: number }) {
  const canEstimate =
    anthropicConfigured && companyId != null && (company?.valoracion == null || company?.scoreEstimadoIa);

  return (
    <Section title="Valoración comercial">
      {company?.scoreEstimadoIa && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Estimación preliminar de la IA, pendiente de confirmar en la primera reunión. Al guardar cambios en la
          ficha se marca como confirmada.
        </p>
      )}
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Valoración (0-5 ★)</span>
          <select
            form={COMPANY_FORM_ID}
            name="valoracion"
            defaultValue={company?.valoracion ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Sin evaluar</option>
            {VALORACION_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {valoracionLabel(v)}
              </option>
            ))}
          </select>
        </label>
        {canEstimate && (
          <form action={estimateScoreAction}>
            <input type="hidden" name="companyId" value={companyId} />
            <button type="submit" className="text-sm text-blue-600 hover:underline pb-2">
              {company?.scoreEstimadoIa ? "Reestimar con IA" : "Estimar con IA"}
            </button>
          </form>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500 hover:underline">
          Desglose detallado (opcional, no afecta a la valoración)
        </summary>
        <div className="grid sm:grid-cols-2 gap-4 mt-3">
          {SCORE_FIELDS.map(({ key, label, max }) => (
            <Field
              key={key}
              label={`${label} (0-${max})`}
              name={key}
              type="number"
              defaultValue={company?.[key] ?? undefined}
            />
          ))}
        </div>
      </details>
    </Section>
  );
}

export function SeguimientoSection({ company, estados }: { company?: Company; estados: string[] }) {
  return (
    <Section title="Seguimiento comercial">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Estado</span>
          <select
            form={COMPANY_FORM_ID}
            name="estado"
            defaultValue={company?.estado ?? estados[0] ?? "Pendiente"}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {company?.estado && !estados.includes(company.estado) && (
              <option value={company.estado}>{company.estado} (fase eliminada)</option>
            )}
            {estados.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Zona de ruta</span>
          <select
            form={COMPANY_FORM_ID}
            name="zonaRuta"
            defaultValue={company?.zonaRuta ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {ZONAS.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Jornada (para el generador de rutas)</span>
          <select
            form={COMPANY_FORM_ID}
            name="jornada"
            defaultValue={company?.jornada ?? "completa"}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {JORNADAS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Fecha última visita"
          name="fechaUltimaVisita"
          type="date"
          defaultValue={company?.fechaUltimaVisita ?? undefined}
        />
        <Field
          label="Próxima visita"
          name="proximaVisita"
          type="date"
          defaultValue={company?.proximaVisita ?? undefined}
        />
        <Field
          label="Hora confirmada (si ya tienes cita)"
          name="proximaVisitaHora"
          type="time"
          defaultValue={company?.proximaVisitaHora ?? undefined}
        />
        <Field label="Competidor actual" name="competidorActual" defaultValue={company?.competidorActual} />
        <Field label="Producto recomendado" name="productoRecomendado" defaultValue={company?.productoRecomendado} />
      </div>
      <TextArea label="Objeciones" name="objeciones" defaultValue={company?.objeciones} />
      <TextArea label="Argumentario específico" name="argumentario" defaultValue={company?.argumentario} />
      <TextArea label="Observaciones" name="observaciones" defaultValue={company?.observaciones} />
    </Section>
  );
}

function CatalogSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string | null | undefined;
  options: string[];
}) {
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <select
        form={COMPANY_FORM_ID}
        name={name}
        defaultValue={value ?? ""}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">—</option>
        {allOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LegalFinancieroSection({
  company,
  companyId,
  formasPago = [],
  plazosPago = [],
}: {
  company?: Company;
  companyId?: number;
  formasPago?: string[];
  plazosPago?: string[];
}) {
  return (
    <Section title="Legal y financiero">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="CIF/NIF" name="cif" defaultValue={company?.cif} />
        <Field label="Razón social fiscal" name="razonSocialFiscal" defaultValue={company?.razonSocialFiscal} />
        <Field label="IBAN" name="iban" defaultValue={company?.iban} />
        <Field label="Banco" name="banco" defaultValue={company?.banco} />
        <Field label="Titular de la cuenta" name="titularCuenta" defaultValue={company?.titularCuenta} />
        <CatalogSelect label="Forma de pago" name="formaPago" value={company?.formaPago} options={formasPago} />
        <CatalogSelect label="Plazo de pago" name="plazoPago" value={company?.plazoPago} options={plazosPago} />
        <Field label="Límite de crédito" name="limiteCredito" defaultValue={company?.limiteCredito} />
      </div>
      <p className="text-xs text-slate-400 -mt-2">
        Las opciones de forma y plazo de pago se gestionan en Configuración.
      </p>
      {companyId != null ? (
        <DocumentUploader
          label="Documento bancario (certificado de titularidad, etc.)"
          companyId={companyId}
          documentUrl={company?.documentoBancarioUrl ?? null}
          folder="bancario"
          uploadAction={saveDocumentoBancarioUrlAction}
          deleteAction={deleteDocumentoBancarioAction}
        />
      ) : (
        <p className="text-xs text-slate-400">
          El documento bancario se podrá subir en cuanto crees la empresa.
        </p>
      )}

      <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
        <h3 className="text-sm font-medium text-slate-700">LOPD / protección de datos</h3>
        <Checkbox
          label="Contrato de encargado de tratamiento firmado"
          name="lopdFirmado"
          defaultChecked={company?.lopdFirmado ?? false}
        />
        <Field
          label="Fecha de firma"
          name="lopdFechaFirma"
          type="date"
          defaultValue={company?.lopdFechaFirma ?? undefined}
        />
        {companyId != null ? (
          <DocumentUploader
            label="Documento LOPD (contrato firmado)"
            companyId={companyId}
            documentUrl={company?.lopdDocumentoUrl ?? null}
            folder="lopd"
            uploadAction={saveLopdDocumentoUrlAction}
            deleteAction={deleteLopdDocumentoAction}
          />
        ) : (
          <p className="text-xs text-slate-400">
            El documento LOPD se podrá subir en cuanto crees la empresa.
          </p>
        )}
      </div>
    </Section>
  );
}

// --- Módulo NETEL: prospección comercial de distribuidores ---
// (ver informe-crm-app.md / propuesta-modulo-netel.md)
export function NetelSection({ company, companyId }: { company?: Company; companyId?: number }) {
  return (
    <Section title="Inteligencia NETEL">
      <div className="flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Prioridad</span>
          <select
            form={COMPANY_FORM_ID}
            name="netelPrioridad"
            defaultValue={company?.netelPrioridad ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— Sin calcular —</option>
            {NETEL_PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Score NETEL (0-100)"
          name="netelScore"
          type="number"
          defaultValue={company?.netelScore ?? undefined}
        />
        {company?.netelPrioridad && (
          <span
            className={`text-xs font-medium rounded-full px-3 py-1.5 mb-0.5 ${
              NETEL_PRIORIDAD_STYLES[company.netelPrioridad] ?? "bg-slate-100 text-slate-500"
            }`}
          >
            {company.netelPrioridad}
          </span>
        )}
        {companyId != null && (
          <form action={recalcularNetelScoreAction}>
            <input type="hidden" name="companyId" value={companyId} />
            <button type="submit" className="text-sm text-blue-600 hover:underline pb-2.5">
              Recalcular a partir de la ficha
            </button>
          </form>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Estrategia de entrada</span>
        <select
          form={COMPANY_FORM_ID}
          name="netelEstrategiaEntrada"
          defaultValue={company?.netelEstrategiaEntrada ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {NETEL_ESTRATEGIAS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <TextArea label="Argumento NETEL personalizado" name="netelArgumento" defaultValue={company?.netelArgumento} />
      <div className="grid sm:grid-cols-2 gap-4">
        <TextArea
          label="Objeción probable"
          name="netelObjecionProbable"
          defaultValue={company?.netelObjecionProbable}
        />
        <TextArea
          label="Respuesta sugerida"
          name="netelRespuestaSugerida"
          defaultValue={company?.netelRespuestaSugerida}
        />
      </div>
      <Field
        label="Pregunta para recepción"
        name="netelPreguntaRecepcion"
        defaultValue={company?.netelPreguntaRecepcion}
      />

      <div className="border-t border-slate-100 pt-4 grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Nivel de investigación</span>
          <select
            form={COMPANY_FORM_ID}
            name="nivelInvestigacion"
            defaultValue={company?.nivelInvestigacion ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {NIVELES_INVESTIGACION.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Field label="Fuente de investigación" name="fuenteInvestigacion" defaultValue={company?.fuenteInvestigacion} />
        <Field
          label="Fecha de verificación"
          name="fechaVerificacionInvestigacion"
          type="date"
          defaultValue={company?.fechaVerificacionInvestigacion ?? undefined}
        />
      </div>
    </Section>
  );
}
