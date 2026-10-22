"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { X, Star, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useStore } from "./Store";
import { PRIORITY_LABEL, DAILY_LIMIT, type Priority, type Task } from "@/types";
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
  const [saving, setSaving] = useState(false);

  const dailyCount = tasks.filter((t) => t.dailyDate === today && t._id !== task?._id).length;
  const dailyFull = dailyCount >= DAILY_LIMIT;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    };
    const okk = task ? await updateTask(task._id, data) : !!(await createTask(data));
    setSaving(false);
    if (okk) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="glass w-full max-w-lg animate-pop bg-ink-900/90 p-6 shadow-lift"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{task ? "Editar tarefa" : "Nova tarefa"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Título</label>
            <input autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" maxLength={140} />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input min-h-[80px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes (opcional)" />
          </div>

          <div>
            <label className="label">Prioridade</label>
            <div className="grid grid-cols-3 gap-2">
              {(["alta", "media", "baixa"] as Priority[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Prazo</label>
              <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Objetivo</label>
              <select className="input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
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
