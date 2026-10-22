"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Check, Target, Flame } from "lucide-react";
import clsx from "clsx";
import { useStore } from "@/components/Store";
import { POSTIT_COLORS } from "@/components/PostIt";
import { addDays, formatBR, longDateBR, todayISO } from "@/lib/dates";
import { sortTasks } from "@/lib/board";
import { DAILY_LIMIT, PRIORITY_LABEL, type Priority } from "@/types";

export default function MetasDiariasPage() {
  const { tasks, setDaily, updateTask, createTask } = useStore();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("alta");

  const daily = tasks.filter((t) => t.dailyDate === date);
  const done = daily.filter((t) => t.status === "concluida").length;
  const full = daily.length >= DAILY_LIMIT;

  const candidates = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "pendente" && t.dailyDate !== date)
        .sort((a, b) => {
          const la = a.dueDate && a.dueDate < today ? 0 : 1;
          const lb = b.dueDate && b.dueDate < today ? 0 : 1;
          return la - lb || sortTasks(a, b);
        }),
    [tasks, date, today]
  );

  // histórico dos últimos 7 dias
  const history = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, -6 + i);
    const ts = tasks.filter((t) => t.dailyDate === d);
    return { d, total: ts.length, done: ts.filter((t) => t.status === "concluida").length };
  });
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.total === DAILY_LIMIT && h.done === DAILY_LIMIT) streak++;
    else if (h.d !== today) break;
  }

  async function quickCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || full) return;
    const t = await createTask({ title: newTitle.trim(), priority: newPriority, dailyDate: date, dueDate: date });
    if (t) setNewTitle("");
  }

  const pct = (done / DAILY_LIMIT) * 100;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-slate-400">Foque no que importa</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Metas do dia</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost px-2" onClick={() => setDate(addDays(date, -1))} aria-label="Dia anterior">
            <ChevronLeft size={18} />
          </button>
          <button className="btn-ghost min-w-[210px] capitalize" onClick={() => setDate(today)}>
            {date === today ? "Hoje · " : ""}
            {longDateBR(date)}
          </button>
          <button className="btn-ghost px-2" onClick={() => setDate(addDays(date, 1))} aria-label="Próximo dia">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* slots */}
        <section className="glass p-6">
          <div className="mb-6 flex items-center gap-5">
            <div
              className="relative grid h-20 w-20 place-items-center rounded-full"
              style={{ background: `conic-gradient(#a78bfa ${pct}%, rgba(255,255,255,.08) 0)` }}
            >
              <div className="grid h-16 w-16 place-items-center rounded-full bg-ink-900 text-lg font-semibold text-white">
                {done}/{DAILY_LIMIT}
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-white">
                {done === DAILY_LIMIT ? "Dia concluído! Excelente trabalho." : `${DAILY_LIMIT - done} meta(s) restante(s)`}
              </p>
              <p className="text-sm text-slate-400">Escolha até {DAILY_LIMIT} tarefas para focar neste dia.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: DAILY_LIMIT }).map((_, i) => {
              const t = daily[i];
              if (!t)
                return (
                  <div key={i} className="grid min-h-[150px] place-items-center rounded-xl border-2 border-dashed border-white/10 text-sm text-slate-500">
                    <span className="flex flex-col items-center gap-1">
                      <Target size={20} /> Meta {i + 1}
                    </span>
                  </div>
                );
              const isDone = t.status === "concluida";
              return (
                <div key={t._id} className={clsx("relative flex min-h-[150px] flex-col rounded-sm p-4 shadow-postit", POSTIT_COLORS[t.priority], isDone && "opacity-70")}>
                  <button onClick={() => setDaily(t._id, null)} className="absolute right-2 top-2 rounded p-1 opacity-50 hover:bg-black/10 hover:opacity-100" aria-label="Remover das metas">
                    <X size={14} />
                  </button>
                  <span className="text-[11px] font-semibold uppercase opacity-60">Meta {i + 1}</span>
                  <p className={clsx("mt-1 flex-1 font-hand text-2xl font-bold leading-6", isDone && "line-through")}>{t.title}</p>
                  <button
                    onClick={() => updateTask(t._id, { status: isDone ? "pendente" : "concluida" })}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-black/10 py-1.5 text-sm font-medium hover:bg-black/20"
                  >
                    <Check size={14} /> {isDone ? "Feito" : "Concluir"}
                  </button>
                </div>
              );
            })}
          </div>

          <form onSubmit={quickCreate} className="mt-6 flex flex-col gap-2 sm:flex-row">
            <input className="input flex-1" placeholder={full ? "Limite de 3 metas atingido" : "Criar nova tarefa como meta..."} value={newTitle} disabled={full} onChange={(e) => setNewTitle(e.target.value)} />
            <select className="input sm:w-32" value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)} disabled={full}>
              {(["alta", "media", "baixa"] as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
            <button className="btn-primary" disabled={full || !newTitle.trim()}>
              <Plus size={16} /> Adicionar
            </button>
          </form>
        </section>

        {/* lateral */}
        <aside className="flex flex-col gap-6">
          <div className="glass p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-white">Últimos 7 dias</h2>
              <span className="flex items-center gap-1 text-sm text-amber-300">
                <Flame size={15} /> {streak}
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              {history.map((h) => (
                <button key={h.d} onClick={() => setDate(h.d)} className="flex flex-1 flex-col items-center gap-1.5" title={`${formatBR(h.d)}: ${h.done}/${h.total}`}>
                  <div className="flex h-20 w-full flex-col-reverse gap-0.5">
                    {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
                      <span key={i} className={clsx("flex-1 rounded-sm", i < h.done ? "bg-emerald-400" : i < h.total ? "bg-violet-400/40" : "bg-white/5")} />
                    ))}
                  </div>
                  <span className={clsx("text-[10px]", h.d === date ? "text-white" : "text-slate-500")}>{h.d.slice(8)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-5">
            <h2 className="mb-3 font-medium text-white">Tarefas pendentes</h2>
            <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {candidates.length === 0 && <li className="text-sm text-slate-500">Nenhuma tarefa pendente.</li>}
              {candidates.map((t) => {
                const late = !!t.dueDate && t.dueDate < today;
                return (
                  <li key={t._id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                    <span className={clsx("h-2 w-2 shrink-0 rounded-full", t.priority === "alta" ? "bg-rose-400" : t.priority === "media" ? "bg-amber-400" : "bg-emerald-400")} />
                    <span className="flex-1 truncate text-sm">{t.title}</span>
                    {late && <span className="text-[10px] text-rose-300">atrasada</span>}
                    <button
                      disabled={full}
                      onClick={() => setDaily(t._id, date)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-violet-300 disabled:opacity-30"
                      aria-label="Definir como meta"
                    >
                      <Plus size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
