"use client";
import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { Calendar, Check, Star, Pencil, RotateCcw, Repeat, Clock, Coins, GripVertical } from "lucide-react";
import { spokenTask } from "@/lib/a11y";
import { basePoints, isDoneOn, isRecurring, recurrenceLabel } from "@/lib/points";
import clsx from "clsx";
import type { Task, Priority } from "@/types";
import { PRIORITY_LABEL } from "@/types";
import { formatBR, todayISO } from "@/lib/dates";
import { tiltOf } from "@/lib/board";
import { useStore } from "./Store";
import { useTaskModal } from "./TaskModal";

export const POSTIT_COLORS: Record<Priority, string> = {
  alta: "bg-rose-200 text-rose-950",
  media: "bg-amber-200 text-amber-950",
  baixa: "bg-emerald-200 text-emerald-950",
};

const TAPE: Record<Priority, string> = {
  alta: "bg-rose-400/50",
  media: "bg-amber-400/50",
  baixa: "bg-emerald-400/50",
};

export function PostItCard({
  task,
  dragging = false,
  overlay = false,
  handle,
}: {
  task: Task;
  dragging?: boolean;
  overlay?: boolean;
  handle?: ReactNode;
}) {
  const { goalById, setDone } = useStore();
  const { open } = useTaskModal();
  const goal = goalById(task.goalId);
  const today = todayISO();
  const done = isDoneOn(task, today);
  const late = !done && !isRecurring(task) && !!task.dueDate && task.dueDate < today;
  const rotate = overlay ? 4 : tiltOf(task._id);

  return (
    <div
      style={{ transform: `rotate(${rotate}deg)` }}
      className={clsx(
        "group relative rounded-sm p-4 pt-5 shadow-postit transition-[box-shadow,opacity,transform]",
        POSTIT_COLORS[task.priority],
        handle && "pl-8",
        overlay && "scale-105 cursor-grabbing shadow-lift",
        dragging && "opacity-30",
        done && !overlay && "opacity-75"
      )}
    >
      {handle}
      {/* fita adesiva */}
      <span aria-hidden="true" className={clsx("absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-2deg] rounded-[2px]", TAPE[task.priority])} />

      <div className="mb-1 flex items-start gap-2">
        <h3 className={clsx("flex-1 font-hand text-[22px] font-bold leading-6", done && "line-through decoration-2")}>{task.title}</h3>
        {task.dailyDate === today && <Star size={16} className="mt-1 shrink-0 fill-current opacity-80" aria-label="Meta de hoje" />}
      </div>

      {task.description && <p className="mb-2 line-clamp-3 text-xs leading-snug opacity-75">{task.description}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
        <span className="flex items-center gap-1 rounded-full bg-black/15 px-2 py-0.5">
          <Coins size={11} /> {done && !isRecurring(task) && task.pointsEarned != null ? `+${task.pointsEarned}` : basePoints(task)}
        </span>
        <span className="rounded-full bg-black/10 px-2 py-0.5">{PRIORITY_LABEL[task.priority]}</span>
        {isRecurring(task) && (
          <span className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5">
            <Repeat size={11} /> {recurrenceLabel(task.recurrence)}
          </span>
        )}
        {task.startTime && (
          <span className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5">
            <Clock size={11} /> {task.startTime}
          </span>
        )}
        {task.dueDate && (
          <span className={clsx("flex items-center gap-1 rounded-full px-2 py-0.5", late ? "bg-red-600 text-white" : "bg-black/10")}>
            <Calendar size={11} /> {formatBR(task.dueDate)}
          </span>
        )}
        {goal && (
          <span className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5">
            <span className="h-2 w-2 rounded-full" style={{ background: goal.color }} />
            <span className="max-w-[110px] truncate">{goal.title}</span>
          </span>
        )}
      </div>

      {!overlay && (
        <div className="absolute -bottom-4 right-2 flex gap-1.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => open(task)}
            className="grid h-9 w-9 place-items-center rounded-full bg-ink-800 text-slate-200 shadow hover:bg-ink-700"
            aria-label={`Editar ${task.title}`}
          >
            <Pencil size={13} />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setDone(task, !done, today)}
            className="grid h-9 w-9 place-items-center rounded-full bg-ink-800 text-slate-200 shadow hover:bg-ink-700"
            aria-pressed={done}
            aria-label={`${done ? "Reabrir" : "Concluir"} ${task.title}`}
          >
            {done ? <RotateCcw size={13} /> : <Check size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}

export function DraggablePostIt({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: task._id, data: { task } });
  // mouse/toque arrastam pelo post-it todo; teclado usa a alça (evita botões dentro de botão)
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined}
      aria-label={`Mover: ${spokenTask(task)}`}
      className="absolute left-1 top-1 z-10 grid h-7 w-6 place-items-center rounded opacity-50 hover:opacity-100 focus-visible:opacity-100"
    >
      <GripVertical size={14} aria-hidden="true" />
    </button>
  );
  return (
    <div ref={setNodeRef} {...pointerListeners} className="cursor-grab touch-none select-none active:cursor-grabbing">
      <PostItCard task={task} dragging={isDragging} handle={handle} />
    </div>
  );
}
