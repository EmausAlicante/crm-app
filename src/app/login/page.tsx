import { getOtpDestinations, maskEmail } from "@/lib/auth";
import { requestCodeAction, verifyCodeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = sp.error === "1";
  const noEmail = sp.noemail === "1";
  const sent = sp.sent === "1";
  const next = typeof sp.next === "string" ? sp.next : "";
  const { email, phone } = await getOtpDestinations();
  const hasDestination = !!(email || phone);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4 shadow-sm">
        <div className="text-center">
          <div className="font-semibold text-lg tracking-tight">
            CRM <span className="text-blue-600">MATIC</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {sent
              ? `Introduce el código que te hemos enviado${email ? ` a ${maskEmail(email)}` : ""}`
              : hasDestination
                ? "Te enviaremos un código de acceso de un solo uso"
                : "¿A qué email quieres recibir los códigos de acceso?"}
          </p>
        </div>

        {noEmail && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            El envío de email no está configurado todavía (falta RESEND_API_KEY). No se puede enviar ningún código
            hasta que se configure.
          </p>
        )}
        {error && !noEmail && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {sent ? "Código incorrecto o caducado." : "No se ha podido enviar el código. Inténtalo de nuevo."}
          </p>
        )}

        {!sent ? (
          <form action={requestCodeAction} className="flex flex-col gap-3">
            {next && <input type="hidden" name="next" value={next} />}
            {!hasDestination && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoFocus
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            )}
            <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
              Enviar código
            </button>
          </form>
        ) : (
          <form action={verifyCodeAction} className="flex flex-col gap-3">
            {next && <input type="hidden" name="next" value={next} />}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Código de 6 dígitos</span>
              <input
                type="text"
                name="code"
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                className="rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-[0.5em]"
              />
            </label>
            <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
              Entrar
            </button>
          </form>
        )}

        {sent && (
          <form action={requestCodeAction} className="text-center">
            {next && <input type="hidden" name="next" value={next} />}
            <button type="submit" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
              Reenviar código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
