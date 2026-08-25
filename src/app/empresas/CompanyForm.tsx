import { saveCompanyAction } from "./actions";
import type { Company } from "@/lib/types";
import { listCatalogOptions } from "@/lib/catalog";
import { listPipelineEstadoNames } from "@/lib/pipelineEstados";
import { listDistinctTags } from "@/lib/tagColors";
import { COMPANY_FORM_ID } from "./formFields";
import {
  ClasificacionSection,
  DatosGeneralesSection,
  LegalFinancieroSection,
  PuntuacionSection,
  SeguimientoSection,
} from "./CompanySections";
import DeleteButton from "./DeleteButton";

export default async function CompanyForm({ company }: { company?: Company }) {
  const isEdit = !!company;
  const [formasPagoOptions, plazosPagoOptions, estados, existingTags] = await Promise.all([
    listCatalogOptions("forma_pago"),
    listCatalogOptions("plazo_pago"),
    listPipelineEstadoNames(),
    listDistinctTags(),
  ]);
  const formasPago = formasPagoOptions.map((o) => o.valor);
  const plazosPago = plazosPagoOptions.map((o) => o.valor);

  return (
    <div className="flex flex-col gap-6">
      <form id={COMPANY_FORM_ID} action={saveCompanyAction} className="flex flex-col gap-6">
        {isEdit && <input type="hidden" name="id" defaultValue={company!.id} />}

        <DatosGeneralesSection company={company} />
        <ClasificacionSection company={company} existingTags={existingTags} />
        <PuntuacionSection company={company} companyId={company?.id} />
        <SeguimientoSection company={company} estados={estados} />
        <LegalFinancieroSection
          company={company}
          companyId={company?.id}
          formasPago={formasPago}
          plazosPago={plazosPago}
        />
      </form>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div>{isEdit && <DeleteButton id={company!.id} />}</div>
          <button
            type="submit"
            form={COMPANY_FORM_ID}
            className="rounded-lg bg-blue-600 text-white text-sm px-5 py-2.5 shadow-lg hover:bg-blue-700"
          >
            {isEdit ? "Guardar cambios" : "Crear empresa"}
          </button>
        </div>
      </div>
    </div>
  );
}
