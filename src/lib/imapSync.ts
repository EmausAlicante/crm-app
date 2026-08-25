import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { emailExists, createEmail } from "./emails";
import { matchEmailToCompany } from "./emailMatch";
import { classifyEmail } from "./ai/emailClassification";
import { createAction } from "./pipeline";
import { listActiveEmailAccountsWithSecrets, type EmailAccountWithSecret } from "./emailAccounts";

const MAX_PER_SYNC = 15;

export type SyncResult = {
  processed: number;
  linked: number;
  notesCreated: number;
  skippedAlreadySeen: number;
  errors: string[];
};

export async function imapConfigured(): Promise<boolean> {
  const accounts = await listActiveEmailAccountsWithSecrets();
  return accounts.length > 0;
}

export async function syncEmails(): Promise<SyncResult> {
  const accounts = await listActiveEmailAccountsWithSecrets();
  if (accounts.length === 0) {
    throw new Error("No hay ninguna cuenta de email configurada.");
  }

  const result: SyncResult = { processed: 0, linked: 0, notesCreated: 0, skippedAlreadySeen: 0, errors: [] };
  for (const account of accounts) {
    await syncAccount(account, result);
  }
  return result;
}

async function syncAccount(account: EmailAccountWithSecret, result: SyncResult): Promise<void> {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: {
      user: account.email,
      pass: account.imapPassword,
    },
    logger: false,
  });

  try {
    await client.connect();
  } catch (e) {
    result.errors.push(`${account.email}: no se pudo conectar (${e instanceof Error ? e.message : String(e)})`);
    return;
  }

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ seen: false }, { uid: true });
      if (!uids || uids.length === 0) return;

      const toProcess = uids.slice(0, MAX_PER_SYNC);

      for (const uid of toProcess) {
        try {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg || !msg.source) continue;

          const parsed = await simpleParser(msg.source);
          const messageId = parsed.messageId || `imapflow-uid-${account.id}-${uid}`;

          if (await emailExists(messageId)) {
            result.skippedAlreadySeen++;
            await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
            continue;
          }

          const fromAddr = parsed.from?.value?.[0];
          const fromEmail = fromAddr?.address || "";
          const fromName = fromAddr?.name || null;
          const subject = parsed.subject || "(sin asunto)";
          const bodyText = (parsed.text || "").trim().slice(0, 4000);

          const match = fromEmail ? await matchEmailToCompany(fromEmail, fromName) : null;
          if (match) result.linked++;

          let classification: string | null = null;
          let reason: string | null = null;
          try {
            const c = await classifyEmail(subject, bodyText, fromEmail);
            classification = c.categoria;
            reason = c.razon;
          } catch (e) {
            result.errors.push(`Clasificación fallida ("${subject}"): ${e instanceof Error ? e.message : String(e)}`);
          }

          let noteCreated = false;
          if (match && (classification === "Urgente" || classification === "Acción requerida")) {
            await createAction({
              companyId: match.companyId,
              tipo: "Email",
              titulo: `${classification}: ${subject}`,
              fechaPrevista: null,
              horaPrevista: null,
              completada: false,
              notas: `De: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}${reason ? `\n${reason}` : ""}\n\n${bodyText.slice(0, 500)}`,
              resultadoLlamada: null,
              motivoRechazo: null,
            });
            noteCreated = true;
            result.notesCreated++;
          }

          await createEmail({
            companyId: match?.companyId ?? null,
            messageId,
            fromEmail: fromEmail || null,
            fromName,
            subject,
            bodyPreview: bodyText.slice(0, 300),
            receivedAt: parsed.date ?? null,
            classification,
            classificationReason: reason,
            linkReason: match?.reason ?? null,
            noteCreated,
            accountEmail: account.email,
          });

          await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
          result.processed++;
        } catch (e) {
          result.errors.push(`${account.email}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}
