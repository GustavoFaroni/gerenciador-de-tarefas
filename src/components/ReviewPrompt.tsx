"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Sun, ClipboardCheck } from "lucide-react";
import clsx from "clsx";
import { useStore } from "./Store";
import { useToast } from "./Toast";
import { POSTIT_COLORS } from "./PostIt";
import { pendingReviews, localDate, type PendingReview } from "@/lib/review";
import { basePoints, isBonusHour, BONUS_MULTIPLIER, WEEKDAYS_LONG } from "@/lib/points";
import { todayISO } from "@/lib/dates";

/** Abre a revisão de qualquer lugar (ex.: botão da barra lateral) */
export const OPEN_REVIEW_EVENT = "abrir-revisao";
const SESSION_KEY = "revisao-mostrada";
const MAX_ITEMS = 20;

type Answer = { done: boolean | null; otherTime: boolean; time: string; note: string };
const keyOf = (p: PendingReview) => `${p.task._id}|${p.date}`;
const hhmm = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const today = todayISO();
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const yesterday = todayISO(new Date(Date.now() - 86_400_000));
  const name = iso === today ? "Hoje" : iso === yesterday ? "Ontem" : WEEKDAYS_LONG[dt.getDay()];
  return `${name}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

/** Hook com a lista de pendências (recalcula a cada minuto) */
export function usePendingReviews() {
  const { tasks, loading } = useStore();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (loading ? [] : pendingReviews(tasks)), [tasks, loading, tick]);
}

export function ReviewPrompt() {
  const { loading, reviewTask } = useStore();
  const toast = useToast();
  const pending = usePendingReviews();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // ao entrar no sistema: abre uma vez por sessão do navegador, se houver pendências
  useEffect(() => {
    if (loading || !pending.length) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem(SESSION_KEY) === "1";
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* sem sessionStorage: mostra mesmo assim */
    }
    if (!shown) setOpen(true);
    // só na primeira carga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    const on = () => {
      openerRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    window.addEventListener(OPEN_REVIEW_EVENT, on);
    return () => window.removeEventListener(OPEN_REVIEW_EVENT, on);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus?.();
  }, []);

  // foco preso dentro da janela, Esc fecha
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    el?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const shown = pending.slice(0, MAX_ITEMS);
  const get = (p: PendingReview): Answer =>
    answers[keyOf(p)] ?? { done: null, otherTime: false, time: p.task.startTime ?? "08:00", note: "" };
  const set = (p: PendingReview, patch: Partial<Answer>) => setAnswers((a) => ({ ...a, [keyOf(p)]: { ...get(p), ...patch } }));
  const answered = shown.filter((p) => get(p).done !== null);

  async function save() {
    setSaving(true);
    let pts = 0;
    let doneCount = 0;
    let skipCount = 0;
    for (const p of answered) {
      const a = get(p);
      const doneAt = a.done ? (a.otherTime ? localDate(p.date, a.time) : p.start).toISOString() : undefined;
      const t = await reviewTask(p.task._id, { date: p.date, done: !!a.done, doneAt, note: a.note.trim() || undefined });
      if (!t) continue;
      if (a.done) {
        doneCount++;
        const c = t.completions?.find((x) => x.date === p.date);
        pts += c?.points ?? t.pointsEarned ?? 0;
      } else skipCount++;
    }
    setSaving(false);
    setAnswers({});
    const parts = [doneCount && `${doneCount} feita${doneCount > 1 ? "s" : ""} (+${pts} pts)`, skipCount && `${skipCount} não feita${skipCount > 1 ? "s" : ""}`].filter(Boolean);
    if (parts.length) toast(`Revisão salva: ${parts.join(", ")}`, "success");
    if (answered.length >= pending.length) close();
  }

  if (!open) return null;

  // agrupa por dia
  const groups = shown.reduce<Record<string, PendingReview[]>>((g, p) => ((g[p.date] ||= []).push(p), g), {});

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rev-h"
        aria-describedby="rev-d"
        className="glass flex max-h-[92vh] w-full max-w-xl animate-pop flex-col bg-ink-900/95 shadow-lift sm:rounded-2xl"
      >
        <div className="border-b border-white/10 p-5">
          <h2 id="rev-h" className="flex items-center gap-2 text-lg font-semibold text-white">
            <ClipboardCheck size={20} className="text-violet-300" aria-hidden="true" /> Como foi?
          </h2>
          <p id="rev-d" className="mt-1 text-sm text-slate-400">
            {pending.length === 0
              ? "Tudo revisado. Nada pendente no calendário."
              : `${pending.length} atividade${pending.length > 1 ? "s" : ""} do calendário já passou${pending.length > 1 ? "aram" : ""}. Você fez?`}
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {Object.entries(groups).map(([date, items]) => (
            <section key={date} aria-label={dayLabel(date)}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{dayLabel(date)}</h3>
              <ul className="space-y-3">
                {items.map((p) => {
                  const a = get(p);
                  const k = keyOf(p).replace(/[^a-z0-9]/gi, "");
                  const hour = a.otherTime ? Number(a.time.slice(0, 2)) : p.start.getHours();
                  const pts = basePoints(p.task) * (isBonusHour(hour) ? BONUS_MULTIPLIER : 1);
                  return (
                    <li key={keyOf(p)} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start gap-3">
                        <span className={clsx("mt-1 h-3 w-3 shrink-0 rounded-sm", POSTIT_COLORS[p.task.priority])} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{p.task.title}</p>
                          <p className="text-xs text-slate-400">
                            {hhmm(p.start)}–{hhmm(p.end)} · {basePoints(p.task)} pts
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2" role="group" aria-label={`Você fez ${p.task.title}?`}>
                        <button
                          type="button"
                          aria-pressed={a.done === true}
                          onClick={() => set(p, { done: true })}
                          className={clsx(
                            "flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition",
                            a.done === true ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-50" : "border-white/15 text-slate-300 hover:bg-white/5"
                          )}
                        >
                          <Check size={16} aria-hidden="true" /> Fiz
                        </button>
                        <button
                          type="button"
                          aria-pressed={a.done === false}
                          onClick={() => set(p, { done: false, otherTime: false })}
                          className={clsx(
                            "flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition",
                            a.done === false ? "border-rose-400/70 bg-rose-500/20 text-rose-50" : "border-white/15 text-slate-300 hover:bg-white/5"
                          )}
                        >
                          <X size={16} aria-hidden="true" /> Não fiz
                        </button>
                      </div>

                      {a.done !== null && (
                        <div className="mt-3 space-y-2">
                          {a.done && (
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-slate-300">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-violet-500"
                                  checked={a.otherTime}
                                  onChange={(e) => set(p, { otherTime: e.target.checked })}
                                />
                                Fiz em outro horário
                              </label>
                              {a.otherTime && (
                                <>
                                  <label className="sr-only" htmlFor={`rt-${k}`}>
                                    Horário em que fez
                                  </label>
                                  <input
                                    id={`rt-${k}`}
                                    type="time"
                                    className="input w-32"
                                    value={a.time}
                                    onChange={(e) => e.target.value && set(p, { time: e.target.value })}
                                  />
                                </>
                              )}
                              <span className="flex items-center gap-1 text-xs text-amber-200">
                                {isBonusHour(hour) && <Sun size={12} aria-hidden="true" />}+{pts} pts
                                {isBonusHour(hour) ? " (dobro da manhã)" : ""}
                              </span>
                            </div>
                          )}
                          <label className="sr-only" htmlFor={`rn-${k}`}>
                            Observação sobre {p.task.title}
                          </label>
                          <textarea
                            id={`rn-${k}`}
                            className="input min-h-[40px] resize-y text-sm"
                            rows={1}
                            maxLength={300}
                            value={a.note}
                            onChange={(e) => set(p, { note: e.target.value })}
                            placeholder={a.done ? "Observação (opcional): como foi?" : "Observação (opcional): o que aconteceu?"}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {pending.length > MAX_ITEMS && <p className="text-center text-xs text-slate-400">E mais {pending.length - MAX_ITEMS}. Elas aparecem depois que você salvar estas.</p>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 p-4">
          <button type="button" onClick={close} className="btn-ghost min-h-[40px]">
            Depois
          </button>
          <button type="button" onClick={save} disabled={!answered.length || saving} className="btn-primary min-h-[40px]">
            {saving ? "Salvando…" : `Salvar ${answered.length || ""} resposta${answered.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
