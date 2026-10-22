"use client";
import { useEffect, useState } from "react";
import { Flag, Plus, Trash2, Check, Calendar, Pencil } from "lucide-react";
import clsx from "clsx";
import { useStore } from "@/components/Store";
import { useTaskModal } from "@/components/TaskModal";
import { formatBR, todayISO } from "@/lib/dates";
import { sortTasks } from "@/lib/board";
import { PRIORITY_LABEL, type Priority } from "@/types";

const COLORS = ["#8b5cf6", "#ec4899", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

export default function ObjetivosPage() {
  const { goals, tasks, createGoal, deleteGoal, createTask, updateTask } = useStore();
  const { open } = useTaskModal();
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("media");
  const today = todayISO();

  useEffect(() => {
    if (!selected && goals.length) setSelected(goals[0]._id);
    if (selected && !goals.find((g) => g._id === selected)) setSelected(goals[0]?._id ?? null);
  }, [goals, selected]);

  const goal = goals.find((g) => g._id === selected);
  const goalTasks = tasks.filter((t) => t.goalId === selected).sort((a, b) => (a.status === b.status ? sortTasks(a, b) : a.status === "pendente" ? -1 : 1));

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const g = await createGoal({ title: title.trim(), description, deadline: deadline || null, color });
    if (g) {
      setTitle("");
      setDescription("");
      setDeadline("");
      setSelected(g._id);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !selected) return;
    const t = await createTask({ title: taskTitle.trim(), priority: taskPriority, goalId: selected });
    if (t) setTaskTitle("");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="text-sm text-slate-400">Planeje a longo prazo</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Objetivos</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-6">
          <form onSubmit={addGoal} className="glass space-y-3 p-5">
            <h2 className="flex items-center gap-2 font-medium text-white">
              <Flag size={16} className="text-violet-300" /> Novo objetivo
            </h2>
            <input className="input" placeholder="Ex.: Concluir o TCC" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="input min-h-[60px]" placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex items-center gap-3">
              <input type="date" className="input flex-1" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={clsx("h-6 w-6 rounded-full transition", color === c && "ring-2 ring-white ring-offset-2 ring-offset-ink-900")}
                    style={{ background: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <button className="btn-primary w-full" disabled={!title.trim()}>
              <Plus size={16} /> Criar objetivo
            </button>
          </form>

          <ul className="space-y-3">
            {goals.length === 0 && <li className="text-sm text-slate-500">Nenhum objetivo ainda.</li>}
            {goals.map((g) => {
              const pct = g.totalTasks ? Math.round(((g.doneTasks ?? 0) / g.totalTasks) * 100) : 0;
              return (
                <li key={g._id}>
                  <button
                    onClick={() => setSelected(g._id)}
                    className={clsx("glass w-full p-4 text-left transition hover:bg-white/[0.07]", selected === g._id && "border-white/25 bg-white/[0.08]")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: g.color }} />
                      <span className="flex-1 truncate font-medium text-white">{g.title}</span>
                      <span className="text-xs text-slate-400">{pct}%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {g.doneTasks}/{g.totalTasks} tarefas{g.deadline ? ` · até ${formatBR(g.deadline)}` : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <section className="glass min-h-[400px] p-6">
          {!goal ? (
            <div className="grid h-full place-items-center text-center text-slate-500">
              <div>
                <Flag size={32} className="mx-auto mb-2" />
                Crie um objetivo e adicione tarefas relacionadas a ele.
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-start gap-3">
                <span className="mt-1.5 h-4 w-4 rounded-full" style={{ background: goal.color }} />
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-white">{goal.title}</h2>
                  {goal.description && <p className="mt-1 text-sm text-slate-400">{goal.description}</p>}
                  {goal.deadline && (
                    <p className={clsx("mt-2 flex items-center gap-1 text-xs", goal.deadline < today ? "text-rose-300" : "text-slate-400")}>
                      <Calendar size={12} /> Prazo: {formatBR(goal.deadline)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (!confirm("Excluir objetivo? As tarefas serão mantidas, apenas desvinculadas.")) return;
                    deleteGoal(goal._id);
                  }}
                  className="btn-ghost text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <form onSubmit={addTask} className="mb-5 flex flex-col gap-2 sm:flex-row">
                <input className="input flex-1" placeholder="Adicionar tarefa a este objetivo..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                <select className="input sm:w-32" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as Priority)}>
                  {(["alta", "media", "baixa"] as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
                <button className="btn-primary" disabled={!taskTitle.trim()}>
                  <Plus size={16} /> Adicionar
                </button>
              </form>

              <ul className="space-y-2">
                {goalTasks.length === 0 && <li className="py-8 text-center text-sm text-slate-500">Nenhuma tarefa neste objetivo.</li>}
                {goalTasks.map((t) => {
                  const done = t.status === "concluida";
                  const late = !done && !!t.dueDate && t.dueDate < today;
                  return (
                    <li key={t._id} className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                      <button
                        onClick={() => updateTask(t._id, { status: done ? "pendente" : "concluida" })}
                        className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded-md border transition", done ? "border-emerald-400 bg-emerald-400 text-ink-950" : "border-slate-500 hover:border-violet-400")}
                        aria-label={done ? "Reabrir" : "Concluir"}
                      >
                        {done && <Check size={12} strokeWidth={3} />}
                      </button>
                      <span className={clsx("flex-1 text-sm", done && "text-slate-500 line-through")}>{t.title}</span>
                      <span className={clsx("rounded-full px-2 py-0.5 text-[11px]", t.priority === "alta" ? "bg-rose-500/15 text-rose-300" : t.priority === "media" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300")}>
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                      {t.dueDate && <span className={clsx("text-xs", late ? "text-rose-300" : "text-slate-500")}>{formatBR(t.dueDate)}</span>}
                      <button onClick={() => open(t)} className="rounded-lg p-1 text-slate-500 opacity-0 hover:bg-white/10 hover:text-white group-hover:opacity-100" aria-label="Editar">
                        <Pencil size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
