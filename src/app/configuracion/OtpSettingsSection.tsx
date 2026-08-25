import { getOtpDestinations } from "@/lib/auth";
import { resendConfigured } from "@/lib/notify";
import { saveOtpDestinationsAction } from "./otpSettingsActions";

export default async function OtpSettingsSection({ error, changed }: { error: boolean; changed: boolean }) {
  const { email, phone } = await getOtpDestinations();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-medium text-slate-800">Acceso — código de un solo uso</h2>
        <p className="text-sm text-slate-500 mt-1">
          Para entrar en la aplicación se envía un código de 6 dígitos a este email. Nada que recordar ni ningún
          usuario/contraseña.
        </p>
      </div>

      {!resendConfigured && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Falta RESEND_API_KEY en las variables de entorno de Vercel — sin eso no se puede enviar ningún código de
          acceso por email.
        </p>
      )}
      {changed && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">Guardado.</p>}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">Introduce un email válido.</p>
      )}

      <form action={saveOtpDestinationsAction} className="grid sm:grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-slate-600">Email para recibir el código</span>
          <input
            type="email"
            name="email"
            defaultValue={email ?? ""}
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-600">Móvil para SMS (opcional)</span>
          <input
            type="tel"
            name="phone"
            defaultValue={phone ?? ""}
            placeholder="+34 600 000 000"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="sm:col-span-2 justify-self-start rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
        >
          Guardar
        </button>
      </form>
      {phone && (
        <p className="text-xs text-slate-400">
          El móvil se guarda, pero el envío por SMS todavía no está activo — hace falta darse de alta en un
          proveedor de SMS (ej. Twilio) y añadir su clave. Mientras tanto, el código siempre llega por email.
        </p>
      )}
    </section>
  );
}
