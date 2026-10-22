"use client";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Clock, AlertTriangle, CheckCircle2, Search, Plus } from "lucide-react";
import clsx from "clsx";
import { useStore } from "./Store";
import { useToast } from "./Toast";
import { useTaskModal } from "./TaskModal";
import { DraggablePostIt, PostItCard } from "./PostIt";
import { DailyStrip } from "./DailyStrip";
import { columnOf, sortTasks } from "@/lib/board";
import { todayISO } from "@/lib/dates";
import { PRIORITY_LABEL, type BoardColumn, type Priority, type Task } from "@/types";

const COLUMNS: { id: BoardColumn; title: string; icon: typeof Clock; accent: string; empty: string }[] = [
  { id: "pendente", title: "Pendentes", icon: Clock, accent: "text-sky-300", empty: "Nenhuma tarefa pendente" },
  { id: "atrasada", title: "Em atraso", icon: AlertTriangle, accent: "text-rose-300", empty: "Nada atrasado. Continue assim!" },
  { id: "concluida", title: "Concluídas", icon: CheckCircle2, accent: "text-emerald-300", empty: "Arraste um post-it aqui para concluir" },
];

export function Board() {
  const { tasks, goals, loading, error, updateTask } = useStore();
  const toast = useToast();
  const { open } = useTaskModal();
  const [active, setActive] = useState<Task | null>(null);
  const [priority, setPriority] = useState<Priority | "todas">("todas");
  const [goal, setGoal] = useState("");
  const [q, setQ] = useState("");
  const today = todayISO();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (priority === "todas" || t.priority === priority) &&
          (!goal || t.goalId === goal) &&
          (!q || t.title.toLowerCase().includes(q.toLowerCase()))
      ),
    [tasks, priority, goal, q]
  );

  const byColumn = useMemo(() => {
    const map: Record<BoardColumn, Task[]> = { pendente: [], atrasada: [], concluida: [] };
    filtered.forEach((t) => map[columnOf(t, today)].push(t));
    Object.values(map).forEach((arr) => arr.sort(sortTasks));
    return map;
  }, [filtered, today]);

  function onDragStart(e: DragStartEvent) {
    setActive((e.active.data.current?.task as Task) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const task = e.active.data.current?.task as Task | undefined;
    const target = e.over?.id as BoardColumn | undefined;
    if (!task || !target) return;
    const from = columnOf(task, today);
    if (from === target) return;

    if (target === "concluida") {
      updateTask(task._id, { status: "concluida" });
      toast("Tarefa concluída!", "success");
    } else if (target === "pendente") {
      // vinda do atraso: reagenda para hoje
      const data: Partial<Task> = { status: "pendente" };
      if (task.dueDate && task.dueDate < today) data.dueDate = today;
      updateTask(task._id, data);
      toast(data.dueDate ? "Reagendada para hoje" : "Tarefa reaberta", "info");
    } else if (target === "atrasada") {
      toast("Tarefas entram em atraso automaticamente quando o prazo vence.", "info");
    }
  }

  const activeFrom = active ? columnOf(active, today) : null;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Quadro de tarefas</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input w-48 pl-9" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input w-auto" value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="">Todos objetivos</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                {g.title}
              </option>
            ))}
          </select>
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            {(["todas", "alta", "media", "baixa"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={clsx(
                  "rounded-lg px-3 py-1 text-xs transition",
                  priority === p ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {p === "todas" ? "Todas" : PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <DailyStrip />

      {error && (
        <div className="glass mb-6 border-rose-400/30 p-4 text-sm text-rose-200">
          Não foi possível carregar as tarefas: {error}. Verifique a variável <code>MONGODB_URI</code>.
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {COLUMNS.map((c) => (
            <Column
              key={c.id}
              {...c}
              tasks={byColumn[c.id]}
              loading={loading}
              blocked={!!active && c.id === "atrasada" && activeFrom !== "atrasada"}
              onAdd={c.id === "pendente" ? () => open() : undefined}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {active ? <PostItCard task={active} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  id,
  title,
  icon: Icon,
  accent,
  empty,
  tasks,
  loading,
  blocked,
  onAdd,
}: (typeof COLUMNS)[number] & { tasks: Task[]; loading: boolean; blocked: boolean; onAdd?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: blocked });
  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "glass board-grid flex min-h-[420px] flex-col p-4 transition",
        isOver && "border-violet-400/50 bg-violet-500/[0.07] ring-2 ring-violet-400/30",
        blocked && "opacity-40"
      )}
    >
      <div className="mb-5 flex items-center gap-2">
        <Icon size={18} className={accent} />
        <h2 className="font-medium text-white">{title}</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{tasks.length}</span>
        <div className="flex-1" />
        {onAdd && (
          <button onClick={onAdd} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Adicionar">
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-sm bg-white/5" />)}
        {!loading && tasks.map((t) => <DraggablePostIt key={t._id} task={t} />)}
        {!loading && tasks.length === 0 && (
          <p className="col-span-full mt-10 text-center text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </section>
  );
}
