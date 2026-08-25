"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { listDueActionsNowAction, toggleActionAction } from "./empresas/pipelineActions";
import { TIPO_STYLES } from "./empresas/PipelineSection";
import { BellIcon } from "./icons";
import type { UpcomingAction } from "@/lib/pipeline";

const POLL_MS = 60_000;
const DISMISSED_KEY = "crm-dismissed-due-actions-v1";

// Short rising two-note chime via the Web Audio API — no audio file needed.
// Browsers may block this without a prior user gesture on the page; that's
// fine, it's best-effort on top of the always-visible bell + badge.
function playAlarm() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [880, 1108];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
    setTimeout(() => ctx.close(), 500);
  } catch {
    // autoplay blocked or unsupported — the visual bell/popup still works
  }
}

export default function DueActionsBell({ timezone }: { timezone: string }) {
  const [dueActions, setDueActions] = useState<UpcomingAction[]>([]);
  const [autoDismissed, setAutoDismissed] = useState<Set<number>>(new Set());
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const knownIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISSED_KEY);
      if (raw) setAutoDismissed(new Set(JSON.parse(raw)));
    } catch {
      // malformed/unavailable storage — keep starting empty
    }
    setDismissedLoaded(true);
  }, []);

  useEffect(() => {
    if (!dismissedLoaded) return;
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(autoDismissed)));
  }, [autoDismissed, dismissedLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      let result: UpcomingAction[];
      try {
        result = await listDueActionsNowAction(timezone);
      } catch {
        return; // transient failure — try again on the next poll
      }
      if (cancelled) return;
      setDueActions(result);
      // "Newly due" includes whatever's already overdue on the very first
      // check (knownIdsRef starts empty) — opening the CRM with something
      // pending should alert right away, not just future transitions.
      const newlyDue = result.filter((a) => !knownIdsRef.current.has(a.id));
      knownIdsRef.current = new Set(result.map((a) => a.id));
      const newlyDueNotDismissed = newlyDue.filter((a) => !autoDismissed.has(a.id));
      if (newlyDueNotDismissed.length > 0) {
        setModalOpen(true);
        playAlarm();
      }
    }

    check();
    const interval = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  function closeModal() {
    setAutoDismissed((prev) => new Set([...prev, ...dueActions.map((a) => a.id)]));
    setModalOpen(false);
  }

  if (dueActions.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title={`${dueActions.length} acción(es) pendiente(s)`}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <BellIcon className="h-5 w-5" />
        <span className="absolute top-1 right-1 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                🔔 {dueActions.length === 1 ? "Tienes una acción pendiente" : `Tienes ${dueActions.length} acciones pendientes`}
              </h2>
            </div>
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {dueActions.map((a) => (
                <div key={a.id} className="flex flex-col gap-1.5 px-5 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                        TIPO_STYLES[a.tipo] ?? TIPO_STYLES.Otro
                      }`}
                    >
                      {a.tipo}
                    </span>
                    <span className="font-medium text-slate-800">{a.empresa}</span>
                  </div>
                  <div className="text-sm text-slate-600">{a.titulo}</div>
                  <div className="text-xs text-slate-400">
                    {a.fechaPrevista}
                    {a.horaPrevista && ` · ${a.horaPrevista.slice(0, 5)}`}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <Link href={`/empresas/${a.companyId}`} onClick={closeModal} className="text-xs text-blue-600 hover:underline">
                      Ver empresa →
                    </Link>
                    <form action={toggleActionAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="companyId" value={a.companyId} />
                      <input type="hidden" name="completada" value="true" />
                      <button type="submit" className="text-xs text-emerald-600 hover:underline">
                        Marcar hecha
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
