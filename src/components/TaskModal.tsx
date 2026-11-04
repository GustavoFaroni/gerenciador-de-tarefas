"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X, Star, Trash2, Sun, Repeat, Coins } from "lucide-react";
import clsx from "clsx";
import { useStore } from "./Store";
import { PRIORITY_LABEL, DAILY_LIMIT, type Priority, type Task, type RecurrenceFreq } from "@/types";
import { BONUS_MULTIPLIER, DEFAULT_POINTS, SLOTS, WEEKDAYS_LONG, WEEKDAYS_SHORT, durationLabel } from "@/lib/points";
import { todayISO } from "@/lib/dates";

type Open = (task?: Task | null, defaults?: Partial<Task>) => void;
const Ctx = createContext<{ open: Open }>({ open: () => {} });
export const useTaskModal = () => useContext(Ctx);

export function TaskModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ task: Task | null; defaults: Partial<Task> } | null>(null);
  const open = useCallback<Open>((task = null, defaults = {}) => setState({ task, defaults }), []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state && <TaskModal task={state.task} defaults={state.defaults} onClose={() => setState(null)} />}
    </Ctx.Provider>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  alta: "border-rose-400/60 bg-rose-400/15 text-rose-200",
  media: "border-amber-400/60 bg-amber-400/15 text-amber-200",
  baixa: "border-emerald-400/60 bg-emerald-400/15 text-emerald-200",
};

function TaskModal({ task, defaults, onClose }: { task: Task | null; defaults: Partial<Task>; onClose: () => void }) {
  const { goals, tasks, createTask, updateTask, deleteTask } = useStore();
  const today = todayISO();
  const base = { ...defaults, ...(task || {}) };
  const [title, setTitle] = useState(base.title || "");
  const [description, setDescription] = useState(base.description || "");
  const [priority, setPriority] = useState<Priority>(base.priority || "media");
  const [dueDate, setDueDate] = useState(base.dueDate || "");
  const [goalId, setGoalId] = useState(base.goalId || "");
  const [isDaily, setIsDaily] = useState(base.dailyDate === today);
  const [points, setPoints] = useState<string>(typeof base.points === "number" ? String(base.points) : "");
  const [scheduledDate, setScheduledDate] = useState(base.scheduledDate || "");
  const [startTime, setStartTime] = useState(base.startTime || "");
  const [duration, setDuration] = useState(base.duration || 1);
  const initialFreq: RecurrenceFreq = base.recurrence?.freq || "none";
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekdays" | "weekly">(
    initialFreq === "weekly" && [...(base.recurrence?.days || [])].sort().join() === "1,2,3,4,5" ? "weekdays" : initialFreq
  );
  const [days, setDays] = useState<number[]>(
    base.recurrence?.days?.length ? base.recurrence.days : [new Date(`${base.scheduledDate || today}T12:00`).getDay()]
  );
  const recurring = repeat !== "none";
  const effectivePts = points === "" ? DEFAULT_POINTS[priority] : Number(points);
  const [saving, setSaving] = useState(false);

  const dailyCount = tasks.filter((t) => t.dailyDate === today && t._id !== task?._id).length;
  const dailyFull = dailyCount >= DAILY_LIMIT;

  const formRef = useRef<HTMLFormElement>(null);

  // diálogo acessível: Esc fecha, Tab fica preso dentro, foco volta para quem abriu
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !formRef.current) return;
      const items = Array.from(
        formRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
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
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const data: Partial<Task> = {
      title: title.trim(),
      description,
      priority,
      dueDate: dueDate || null,
      goalId: goalId || null,
      // mantém meta de outro dia se não mexeu; marca/desmarca a de hoje
      dailyDate: isDaily ? today : base.dailyDate === today ? null : base.dailyDate ?? null,
      points: points === "" ? null : Math.max(0, Math.min(1000, Math.round(Number(points) || 0))),
      startTime: startTime || null,
      duration,
      scheduledDate: recurring ? null : scheduledDate || null,
      recurrence: recurring
        ? {
            freq: repeat === "daily" ? "daily" : "weekly",
            days: repeat === "weekdays" ? [1, 2, 3, 4, 5] : repeat === "weekly" ? (days.length ? days : [1]) : [],
            start: base.recurrence?.start || scheduledDate || today,
            until: null,
          }
        : { freq: "none", days: [], start: null, until: null },
    };
    const okk = task ? await updateTask(task._id, data) : !!(await createTask(data));
    setSaving(false);
    if (okk) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-heading"
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="glass max-h-[92vh] w-full max-w-lg animate-pop overflow-y-auto bg-ink-900/90 p-6 shadow-lift"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="tm-heading" className="text-lg font-semibold text-white">{task ? "Editar tarefa" : "Nova tarefa"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-white/10">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="tm-title">Título</label>
            <input id="tm-title" required autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" maxLength={140} />
          </div>
          <div>
            <label className="label" htmlFor="tm-desc">Descrição</label>
            <textarea id="tm-desc" className="input min-h-[80px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes (opcional)" />
          </div>

          <div>
            <p className="label" id="tm-prio">Prioridade</p>
            <div role="group" aria-labelledby="tm-prio" className="grid grid-cols-3 gap-2">
              {(["alta", "media", "baixa"] as Priority[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  aria-pressed={priority === p}
                  className={clsx(
                    "rounded-xl border px-3 py-2 text-sm transition",
                    priority === p ? PRIORITY_STYLE[p] : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="tm-points">Pontos</label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-32">
                <Coins size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-300" />
                <input
                  id="tm-points"
                  aria-describedby="tm-points-hint"
                  type="number"
                  min={0}
                  max={1000}
                  className="input pl-9"
                  value={points}
                  placeholder={String(DEFAULT_POINTS[priority])}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </div>
              <span id="tm-points-hint" className="flex items-center gap-1.5 text-xs text-slate-400">
                <Sun size={14} className="text-amber-300" />
                Vale <b className="text-amber-200">{effectivePts * BONUS_MULTIPLIER}</b> se concluir entre 6h e 12h
              </span>
            </div>
            {points === "" && <p className="mt-1 text-xs text-slate-400">Vazio = padrão da prioridade ({DEFAULT_POINTS[priority]} pts)</p>}
          </div>

          <div>
            <label className="label" htmlFor="tm-repeat">
              <Repeat size={12} className="mr-1 inline" />
              Repetição
            </label>
            <select id="tm-repeat" className="input" value={repeat} onChange={(e) => setRepeat(e.target.value as typeof repeat)}>
              <option value="none">Não repete</option>
              <option value="daily">Todo dia</option>
              <option value="weekdays">Dias úteis (seg a sex)</option>
              <option value="weekly">Toda semana, nos dias…</option>
            </select>
            {repeat === "weekly" && (
              <div className="mt-2 flex gap-1.5">
                {WEEKDAYS_SHORT.map((l, i) => (
                  <button
                    type="button"
                    key={i}
                    aria-label={WEEKDAYS_LONG[i]}
                    aria-pressed={days.includes(i)}
                    onClick={() => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()))}
                    className={clsx(
                      "h-8 w-8 rounded-lg border text-xs font-semibold transition",
                      days.includes(i) ? "border-violet-400/60 bg-violet-500/25 text-violet-100" : "border-white/10 bg-white/5 text-slate-400"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {!recurring && (
              <div>
                <label className="label" htmlFor="tm-day">Dia no calendário</label>
                <input id="tm-day" type="date" className="input" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
            )}
            <div>
              <label className="label" htmlFor="tm-time">Horário</label>
              <select id="tm-time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                <option value="">Sem horário</option>
                {SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tm-dur">Duração</label>
              <select id="tm-dur" className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
                  <option key={n} value={n}>
                    {durationLabel(n)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tm-due">Prazo</label>
              <input id="tm-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="tm-goal">Objetivo</label>
              <select id="tm-goal" className="input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">Nenhum</option>
                {goals.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!isDaily && dailyFull}
            aria-pressed={isDaily}
            onClick={() => setIsDaily((v) => !v)}
            className={clsx(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
              isDaily ? "border-violet-400/60 bg-violet-500/15 text-violet-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            )}
          >
            <Star size={18} className={isDaily ? "fill-violet-300 text-violet-300" : ""} />
            <span className="flex-1">
              Meta de hoje
              <span className="block text-xs text-slate-400">
                {dailyFull && !isDaily ? `Você já tem ${DAILY_LIMIT} metas hoje` : `${dailyCount + (isDaily ? 1 : 0)}/${DAILY_LIMIT} definidas`}
              </span>
            </span>
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {task && (
            <button
              type="button"
              onClick={() => {
                deleteTask(task._id);
                onClose();
              }}
              className="btn-ghost text-rose-300 hover:bg-rose-500/10"
            >
              <Trash2 size={16} /> Excluir
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !title.trim()} className="btn-primary">
            {saving ? "Salvando..." : task ? "Salvar" : "Criar"}
          </button>
        </div>
      </form>
    </div>
  );
}
