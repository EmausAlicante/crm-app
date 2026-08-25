import Link from "next/link";
import CompanyForm from "../CompanyForm";

export default function NewCompanyPage() {
  return (
    <div className="flex flex-col gap-5 pb-20">
      <div className="flex items-center gap-4">
        <div
          title="Podrás subir el logo en cuanto crees la empresa"
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-center text-xs text-slate-300"
        >
          Logo disponible tras crear
        </div>
        <div>
          <Link href="/empresas" className="text-sm text-slate-500 hover:underline">
            ← Empresas
          </Link>
          <h1 className="text-xl font-semibold mt-1">Nueva empresa</h1>
        </div>
      </div>
      <CompanyForm />
    </div>
  );
}
