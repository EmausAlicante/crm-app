import Link from "next/link";
import ImportWizard from "./ImportWizard";

export default function ImportarPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/empresas" className="text-sm text-slate-500 hover:underline">
          ← Empresas
        </Link>
        <h1 className="text-xl font-semibold mt-1">Importar empresas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sube un Excel o CSV con cualquier formato de columnas. Detecta automáticamente empresas ya existentes
          (por web, teléfono o nombre): por defecto solo rellena huecos vacíos, y te avisa si algún dato del
          archivo no coincide con el que ya tienes para que decidas si quieres sobrescribirlo.
        </p>
      </div>
      <ImportWizard />
    </div>
  );
}
