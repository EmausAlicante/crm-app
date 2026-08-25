import { NextRequest, NextResponse } from "next/server";
import { computeNextActionCandidates, getDailyDigest } from "@/lib/nextActions";
import { getSettings } from "@/lib/settings";
import { resendConfigured, sendEmail } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Vercel Cron hits this once a day (see vercel.json). It's a safe no-op until
// RESEND_API_KEY and a notification email (Configuración) are both set.
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const settings = await getSettings();
  if (!resendConfigured || !settings.notifyEmail) {
    return NextResponse.json({ sent: false, reason: "not configured", resendConfigured, hasNotifyEmail: !!settings.notifyEmail });
  }

  const candidates = await computeNextActionCandidates();
  if (candidates.length === 0) {
    return NextResponse.json({ sent: false, reason: "no pending actions" });
  }

  const digest = await getDailyDigest(candidates);
  const itemsHtml = candidates
    .map(
      (c) =>
        `<li><a href="https://crm-app-ruddy-one.vercel.app/empresas/${c.companyId}">${c.companyName}</a>: ${c.motivo}</li>`
    )
    .join("");
  const html = `<p>${digest}</p><ul>${itemsHtml}</ul>`;

  try {
    await sendEmail(settings.notifyEmail, `CRM MATIC — ${candidates.length} acción(es) pendientes hoy`, html);
    return NextResponse.json({ sent: true, count: candidates.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
