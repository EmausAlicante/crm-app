import { getSettings } from "@/lib/settings";
import { listEmailAccounts } from "@/lib/emailAccounts";
import { listCatalogOptions } from "@/lib/catalog";
import { listRutaDias } from "@/lib/rutaDias";
import { listPipelineEstados } from "@/lib/pipelineEstados";
import { blobConfigured } from "@/lib/blob";
import { TIMEZONES } from "@/lib/formatDate";
import { resendConfigured } from "@/lib/notify";
import { listDistinctTags, listTagColors } from "@/lib/tagColors";
import AppLogoUploader from "./AppLogoUploader";
import EmailAccountsSection from "./EmailAccountsSection";
import CatalogSection from "./CatalogSection";
import RutaDiasSection from "./RutaDiasSection";
import PipelineEstadosSection from "./PipelineEstadosSection";
import TagColorsSection from "./TagColorsSection";
import OtpSettingsSection from "./OtpSettingsSection";
import { saveNotifyEmailAction, saveTimezoneAction } from "./settingsActions";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pipelineError = sp.pipelineError === "1";
  const otpError = sp.otpError === "1";
  const otpChanged = sp.otpChanged === "1";

  const [settings, accounts, formasPago, plazosPago, rutaDias, pipelineEstados, distinctTags, tagColors] =
    await Promise.all([
      getSettings(),
      listEmailAccounts(),
      listCatalogOptions("forma_pago"),
      listCatalogOptions("plazo_pago"),
      listRutaDias(),
      listPipelineEstados(),
      listDistinctTags(),
      listTagColors(),
    ]);
  // Include tags that already have a custom color even if no company currently
  // uses them, so a color choice doesn't just disappear from view.
  const allTags = [...new Set([...distinctTags, ...Object.keys(tagColors)])].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Ajustes generales del CRM: marca, zona horaria y correo.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="font-medium text-slate-800">Logo</h2>
        <AppLogoUploader logoUrl={settings.logoUrl} blobConfigured={blobConfigured} />
        {!blobConfigured && (
          <p className="text-xs text-amber-600">
            Almacenamiento de archivos no configurado. Activa Vercel Blob y añade BLOB_READ_WRITE_TOKEN para poder subir un logo.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="font-medium text-slate-800">Zona horaria</h2>
        <form action={saveTimezoneAction} className="flex items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Se usa para mostrar fechas y horas (reuniones, correos...)</span>
            <select name="timezone" defaultValue={settings.timezone} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-blue-600 text-white text-sm px-4 py-2 hover:bg-blue-700">
            Guardar
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <h2 className="font-medium text-slate-800">Avisos por email</h2>
        <p className="text-sm text-slate-500">
          Resumen diario de acciones vencidas o que vencen hoy. En pantalla ya está siempre activo (Dashboard y aviso
          en el menú); esto añade el mismo resumen por email.
        </p>
        {!resendConfigured && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            Falta configurar el envío de emails: crea una cuenta gratuita en resend.com, genera una API key y añádela
            como RESEND_API_KEY en las variables de entorno de Vercel. Hasta entonces el email destino de aquí abajo
            se guarda pero no se envía nada.
          </p>
        )}
        <form action={saveNotifyEmailAction} className="flex items-end gap-3">
          <label className="flex flex-col gap-1 text-sm flex-1 max-w-sm">
            <span className="text-slate-600">Email al que enviar el resumen diario</span>
            <input
              type="email"
              name="notifyEmail"
              defaultValue={settings.notifyEmail ?? ""}
              placeholder="tucorreo@ejemplo.com"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" className="rounded-lg bg-blue-600 text-white text-sm px-4 py-2 hover:bg-blue-700">
            Guardar
          </button>
        </form>
      </section>

      <OtpSettingsSection error={otpError} changed={otpChanged} />

      <TagColorsSection tags={allTags} tagColors={tagColors} />

      <PipelineEstadosSection estados={pipelineEstados} bloqueado={pipelineError} />

      <RutaDiasSection rutaDias={rutaDias} />

      <CatalogSection title="Formas de pago" tipo="forma_pago" options={formasPago} />
      <CatalogSection title="Plazos de pago" tipo="plazo_pago" options={plazosPago} />

      <EmailAccountsSection accounts={accounts} />
    </div>
  );
}
