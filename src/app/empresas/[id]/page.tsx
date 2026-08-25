import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompany } from "@/lib/companies";
import { listContacts } from "@/lib/contacts";
import { listActionsForCompany } from "@/lib/pipeline";
import { listNotes } from "@/lib/notes";
import { listRecordings } from "@/lib/recordings";
import { blobConfigured } from "@/lib/blob";
import { getSettings } from "@/lib/settings";
import { listCatalogOptions } from "@/lib/catalog";
import { listPipelineEstadoColors, listPipelineEstadoNames } from "@/lib/pipelineEstados";
import { listDistinctTags } from "@/lib/tagColors";
import { saveCompanyAction } from "../actions";
import { COMPANY_FORM_ID } from "../formFields";
import {
  ClasificacionSection,
  DatosGeneralesSection,
  LegalFinancieroSection,
  PuntuacionSection,
  SeguimientoSection,
} from "../CompanySections";
import LogoUploader from "../LogoUploader";
import ContactsSection from "../ContactsSection";
import PipelineSection from "../PipelineSection";
import RecordingsSection from "../RecordingsSection";
import KeyInfo from "../KeyInfo";
import NotesSection from "../NotesSection";
import UnsavedChangesIndicator from "../UnsavedChangesIndicator";
import RatingBadge from "../RatingBadge";
import EstadoBadge from "../EstadoBadge";
import CompanyTabs from "../CompanyTabs";
import DeleteButton from "../DeleteButton";
import SaveButton from "../SaveButton";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justSaved = sp.guardado === "1";
  const defaultTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const sugerirSiguiente = sp.siguiente === "1";
  const analisisId = typeof sp.analisisId === "string" ? Number(sp.analisisId) : null;
  const companyId = Number(id);
  const [company, contacts, actions, notes, recordings, settings, formasPagoOptions, plazosPagoOptions, estados, estadoColors, existingTags] =
    await Promise.all([
      getCompany(companyId),
      listContacts(companyId),
      listActionsForCompany(companyId),
      listNotes(companyId),
      listRecordings(companyId),
      getSettings(),
      listCatalogOptions("forma_pago"),
      listCatalogOptions("plazo_pago"),
      listPipelineEstadoNames(),
      listPipelineEstadoColors(),
      listDistinctTags(),
    ]);
  if (!company) notFound();
  const formasPago = formasPagoOptions.map((o) => o.valor);
  const plazosPago = plazosPagoOptions.map((o) => o.valor);
  const analisisRecording = analisisId ? (recordings.find((r) => r.id === analisisId) ?? null) : null;
  const recentActions = actions
    .filter((a) => a.completada && a.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-5 pb-20">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <LogoUploader companyId={companyId} logoUrl={company.logoUrl} blobConfigured={blobConfigured} />
          <div>
            <Link href="/empresas" className="text-sm text-slate-500 hover:underline">
              ← Empresas
            </Link>
            <h1 className="text-xl font-semibold mt-1 flex items-center gap-2">
              {company.empresa}
              <UnsavedChangesIndicator formId={COMPANY_FORM_ID} />
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
              <RatingBadge valoracion={company.valoracion} />
              <EstadoBadge estado={company.estado} color={estadoColors[company.estado]} />
            </div>
          </div>
        </div>
        <Link
          href={`/rutas?empresaId=${company.id}&generar=1`}
          className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 whitespace-nowrap"
        >
          Ver ruta con empresas cercanas →
        </Link>
      </div>

      <KeyInfo company={company} contacts={contacts} timezone={settings.timezone} />

      <NotesSection companyId={companyId} notes={notes} recentActions={recentActions} timezone={settings.timezone} />

      <form id={COMPANY_FORM_ID} action={saveCompanyAction}>
        <input type="hidden" name="id" defaultValue={company.id} />
      </form>

      <CompanyTabs
        defaultTab={defaultTab}
        tabs={[
          {
            key: "general",
            label: "General",
            content: (
              <>
                <DatosGeneralesSection company={company} />
                <ClasificacionSection company={company} existingTags={existingTags} />
                <ContactsSection companyId={companyId} contacts={contacts} />
              </>
            ),
          },
          {
            key: "comercial",
            label: "Comercial",
            content: (
              <>
                <PuntuacionSection company={company} companyId={companyId} />
                <SeguimientoSection company={company} estados={estados} />
                <PipelineSection
                  companyId={companyId}
                  actions={actions}
                  sugerirSiguiente={sugerirSiguiente}
                  analisisRecording={analisisRecording}
                />
              </>
            ),
          },
          {
            key: "legal",
            label: "Legal-Financiero",
            content: (
              <LegalFinancieroSection
                company={company}
                companyId={companyId}
                formasPago={formasPago}
                plazosPago={plazosPago}
              />
            ),
          },
          {
            key: "reuniones",
            label: "Reuniones",
            content: <RecordingsSection companyId={companyId} recordings={recordings} timezone={settings.timezone} />,
          },
        ]}
      />

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <DeleteButton id={company.id} />
          <SaveButton formId={COMPANY_FORM_ID} justSaved={justSaved} />
        </div>
      </div>
    </div>
  );
}
