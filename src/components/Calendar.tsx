"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Check, Coins, Repeat, Sun, StickyNote, Plus, GripVertical } from "lucide-react";
import clsx from "clsx";
import { useStore } from "./Store";
import { useToast } from "./Toast";
import { useTaskModal } from "./TaskModal";
import { POSTIT_COLORS } from "./PostIt";
import { addDays, todayISO } from "@/lib/dates";
import { sortTasks } from "@/lib/board";
import {
  BONUS_END_HOUR,
  BONUS_MULTIPLIER,
  BONUS_START_HOUR,
  SLOTS,
  WEEKDAYS_LONG,
  basePoints,
  earnedOn,
  endTime,
  isDoneOn,
  isRecurring,
  occursOn,
  recurrenceLabel,
  slotIndex,
} from "@/lib/points";
import { PRIORITY_LABEL, type Task } from "@/types";
import { dndAnnouncements, dndInstructions, spokenDate, spokenTask } from "@/lib/a11y";

const ROW_H = 34; // altura de um bloco de 30 min (px)

/** Segunda-feira da semana de uma data */
function mondayOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}
const dowOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
const dayNum = (iso: string) => iso.slice(8);
const monthShort = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Distribui blocos que se sobrepõem em colunas lado a lado */
function layoutDay(items: { task: Task; start: number; end: number }[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: { task: Task; start: number; end: number; lane: number; lanes: number }[] = [];
  let cluster: typeof out = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => (c.lanes = lanes));
    out.push(...cluster);
    cluster = [];
  };
  for (const it of sorted) {
    if (it.start >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => c.end > it.start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ ...it, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}

/**
 * A página é pré-gerada no build: tudo que depende da hora atual (linha do "agora",
 * horários passados, foco inicial) só pode ser calculado no navegador.
 */
export function Calendar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className="glass h-[60vh] animate-pulse" aria-busy="true" aria-label="Carregando calendário" />;
  }
  return <CalendarView />;
}

function CalendarView() {
  const { tasks, loading, updateTask, setDone, balance, redemptions } = useStore();
  const toast = useToast();
  const { open } = useTaskModal();
  const isMobile = useIsMobile();
  const now = useNow();
  const today = todayISO(now);
  const [anchor, setAnchor] = useState(today); // dia selecionado
  const [active, setActive] = useState<Task | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // grade navegável pelas setas: só um quadrado fica no Tab por vez
  const [focusKey, setFocusKey] = useState(() => `${today}|${SLOTS[Math.max(BONUS_START_HOUR * 2, now.getHours() * 2)]}`);

  const weekStart = mondayOf(anchor);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const days = useMemo(() => (isMobile ? [anchor] : week), [isMobile, anchor, week]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // rola até 1h antes de agora (ou 6h) ao abrir
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = Math.max(0, Math.min(now.getHours() - 1, 18));
    el.scrollTop = Math.max(BONUS_START_HOUR, h) * 2 * ROW_H - 8;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const unscheduled = useMemo(
    () =>
      tasks
        .filter((t) => (isRecurring(t) ? !t.startTime : t.status === "pendente" && !(t.scheduledDate && t.startTime)))
        .sort(sortTasks),
    [tasks]
  );

  const byDay = useMemo(() => {
    const map: Record<string, ReturnType<typeof layoutDay>> = {};
    for (const d of days) {
      const items = tasks
        .filter((t) => t.startTime && occursOn(t, d))
        .map((t) => {
          const start = slotIndex(t.startTime as string);
          return { task: t, start, end: Math.min(48, start + (t.duration || 1)) };
        })
        .filter((x) => x.start >= 0);
      map[d] = layoutDay(items);
    }
    return map;
  }, [tasks, days]);

  const slotId = (day: string, time: string) => `slot-${day}-${time.replace(":", "")}`;
  const focusDay = focusKey.split("|")[0];
  const tabbableKey = days.includes(focusDay) ? focusKey : `${days[0]}|${focusKey.split("|")[1]}`;

  function onSlotKey(e: React.KeyboardEvent, day: string, i: number) {
    const keys: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      PageUp: [0, -4],
      PageDown: [0, 4],
    };
    let next: [string, number] | null = null;
    if (e.key === "Home") next = [day, 0];
    else if (e.key === "End") next = [day, 47];
    else if (keys[e.key]) {
      const [dx, dy] = keys[e.key];
      const ni = Math.max(0, Math.min(47, i + dy));
      let nd = day;
      if (dx) {
        nd = addDays(day, dx);
        if (isMobile) setAnchor(nd);
        else if (!week.includes(nd)) setAnchor(nd);
      }
      next = [nd, ni];
    }
    if (!next) return;
    e.preventDefault();
    const [nd, ni] = next;
    setFocusKey(`${nd}|${SLOTS[ni]}`);
    const el = document.getElementById(slotId(nd, SLOTS[ni]));
    // foco imediato quando o quadrado já está na tela (teclas rápidas não se perdem);
    // se mudou de semana/dia, espera o novo dia renderizar
    if (el) el.focus();
    else requestAnimationFrame(() => document.getElementById(slotId(nd, SLOTS[ni]))?.focus());
  }

  // faixas de tempo livre agendado/usado (resgates com horário)
  const leisure = useMemo(() => {
    const map: Record<string, { id: string; top: number; height: number; label: string }[]> = {};
    for (const r of redemptions) {
      if (!r.startAt) continue;
      const st = new Date(r.startAt);
      const d = todayISO(st);
      if (!days.includes(d)) continue;
      const startMin = st.getHours() * 60 + st.getMinutes();
      const len = Math.min(r.minutes, 24 * 60 - startMin);
      const fmt = (x: Date) => x.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const en = new Date(st.getTime() + r.minutes * 60_000);
      (map[d] ||= []).push({
        id: r._id,
        top: (startMin / 30) * ROW_H,
        height: (len / 30) * ROW_H,
        label: `Tempo livre ${fmt(st)}–${fmt(en)}${r.note ? ` · ${r.note}` : ""}`,
      });
    }
    return map;
  }, [redemptions, days]);

  function onDragStart(e: DragStartEvent) {
    setActive((e.active.data.current?.task as Task) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const task = e.active.data.current?.task as Task | undefined;
    const over = e.over?.id ? String(e.over.id) : "";
    if (!task || !over) return;

    if (over === "unscheduled") {
      if (!task.startTime) return;
      updateTask(task._id, isRecurring(task) ? { startTime: null } : { startTime: null, scheduledDate: null });
      toast("Voltou para os post-its sem horário", "info");
      return;
    }
    const [, day, time] = over.split("|");
    if (!day || !time) return;
    if (isRecurring(task)) {
      const r = task.recurrence!;
      const moveDay = r.freq === "weekly" && (r.days?.length ?? 0) <= 1 && !r.days?.includes(dowOf(day));
      updateTask(task._id, { startTime: time, ...(moveDay ? { recurrence: { ...r, days: [dowOf(day)] } } : {}) });
      toast(`${recurrenceLabel(moveDay ? { ...r, days: [dowOf(day)] } : r)} às ${time}`, "success");
    } else {
      if (task.scheduledDate === day && task.startTime === time) return;
      updateTask(task._id, { scheduledDate: day, startTime: time });
      toast(`Agendada: ${WEEKDAYS_LONG[dowOf(day)]} ${dayNum(day)} às ${time}`, "success");
    }
  }

  const nowIdx = now.getHours() * 2 + now.getMinutes() / 30;
  const todayPts = earnedOn(tasks, today);

  return (
    <div>
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">
            {isMobile
              ? new Date(`${anchor}T12:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
              : `${dayNum(week[0])} ${monthShort(week[0])} – ${dayNum(week[6])} ${monthShort(week[6])}`}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Calendário</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            <Coins size={16} className="text-amber-300" />
            <span>
              Hoje <b>+{todayPts}</b>
            </span>
            <span className="text-amber-200/50">·</span>
            <span>
              Saldo <b>{balance}</b> pts
            </span>
          </div>
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setAnchor(addDays(anchor, isMobile ? -1 : -7))}
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
              aria-label={isMobile ? "Dia anterior" : "Semana anterior"}
            >
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setAnchor(today)} className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
              Hoje
            </button>
            <button
              onClick={() => setAnchor(addDays(anchor, isMobile ? 1 : 7))}
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
              aria-label={isMobile ? "Próximo dia" : "Próxima semana"}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        accessibility={{ announcements: dndAnnouncements, screenReaderInstructions: dndInstructions }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <Unscheduled tasks={unscheduled} onAdd={() => open(null, { scheduledDate: anchor })} />

          <section className="glass min-w-0 overflow-hidden">
            {/* seletor de dia (celular) */}
            {isMobile && (
              <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
                {week.map((d) => (
                  <button
                    key={d}
                    onClick={() => setAnchor(d)}
                    aria-pressed={d === anchor}
                    aria-label={spokenDate(d)}
                    className={clsx(
                      "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center rounded-lg py-1.5 text-xs",
                      d === anchor ? "bg-violet-500/30 text-white" : d === today ? "text-violet-300" : "text-slate-400"
                    )}
                  >
                    <span className="uppercase">{WEEKDAYS_LONG[dowOf(d)]}</span>
                    <span className="text-base font-semibold">{dayNum(d)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* cabeçalho dos dias */}
            <div className="grid border-b border-white/10" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}>
              <div className="flex items-end justify-center pb-1 text-[10px] text-slate-400" aria-hidden="true">30 min</div>
              {days.map((d) => {
                const pts = earnedOn(tasks, d);
                return (
                  <div key={d} className={clsx("border-l border-white/5 px-2 py-2 text-center", d === today && "bg-violet-500/10")}>
                    <p className={clsx("text-xs uppercase", d === today ? "text-violet-300" : "text-slate-400")}>{WEEKDAYS_LONG[dowOf(d)]}</p>
                    <p className={clsx("text-lg font-semibold leading-tight", d === today ? "text-white" : "text-slate-200")}>{dayNum(d)}</p>
                    <p className="text-[11px] text-amber-200/80">{pts ? `+${pts} pts` : " "}</p>
                  </div>
                );
              })}
            </div>

            {/* grade de horários */}
            <p id="cal-grid-hint" className="sr-only">
              Grade de horários em blocos de 30 minutos. Use as setas para mudar de horário e de dia, Page Up e Page Down para pular 2 horas, e Enter
              para criar uma tarefa no horário.
            </p>
            <div
              ref={scrollRef}
              role="group"
              aria-label="Grade de horários"
              aria-describedby="cal-grid-hint"
              className="relative max-h-[calc(100vh-260px)] min-h-[420px] overflow-y-auto"
            >
              <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}>
                {/* coluna de horas (decorativa: cada quadrado já anuncia o horário) */}
                <div aria-hidden="true">
                  {SLOTS.map((s, i) => {
                    const bonus = i >= BONUS_START_HOUR * 2 && i < BONUS_END_HOUR * 2;
                    return (
                      <div
                        key={s}
                        style={{ height: ROW_H }}
                        className={clsx(
                          "relative pr-1.5 text-right text-[11px] tabular-nums",
                          i % 2 ? "text-slate-400" : "font-medium text-slate-200",
                          bonus && "bg-amber-300/[0.05]"
                        )}
                      >
                        <span className="relative -top-2">{s}</span>
                        {i === BONUS_START_HOUR * 2 && (
                          <span className="absolute left-1 top-3 flex items-center gap-0.5 text-[10px] font-semibold text-amber-300" title="Concluir entre 6h e 12h vale o dobro">
                            <Sun size={10} />×{BONUS_MULTIPLIER}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {days.map((d) => (
                  <div key={d} className="relative border-l border-white/5">
                    {SLOTS.map((s, i) => (
                      <SlotCell
                        key={s}
                        id={slotId(d, s)}
                        day={d}
                        time={s}
                        index={i}
                        tabbable={tabbableKey === `${d}|${s}`}
                        isPast={d < today || (d === today && i + 1 <= nowIdx)}
                        onFocus={() => setFocusKey(`${d}|${s}`)}
                        onKeyDown={(e) => onSlotKey(e, d, i)}
                        onCreate={() => open(null, { scheduledDate: d, startTime: s })}
                      />
                    ))}
                    {d === today && (
                      <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowIdx * ROW_H }}>
                        <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-rose-400" />
                        <span className="h-px flex-1 bg-rose-400" />
                      </div>
                    )}
                    {leisure[d]?.map((l) => (
                      <div
                        key={l.id}
                        className="pointer-events-none absolute inset-x-0 z-[5] overflow-hidden border-l-4 border-emerald-400 bg-emerald-500/15 px-1.5 py-0.5"
                        style={{ top: l.top, height: l.height }}
                      >
                        <span className="block truncate text-[11px] font-semibold text-emerald-200">{l.label}</span>
                      </div>
                    ))}
                    {byDay[d]?.map((b) => (
                      <Block
                        key={`${b.task._id}-${d}`}
                        task={b.task}
                        day={d}
                        top={b.start * ROW_H}
                        height={(b.end - b.start) * ROW_H}
                        left={(b.lane / b.lanes) * 100}
                        width={100 / b.lanes}
                        compact={days.length > 1 && b.lanes > 1}
                        narrow={days.length > 1}
                        onToggle={() => setDone(b.task, !isDoneOn(b.task, d), d)}
                        onOpen={() => open(b.task)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {active ? (
            <div className={clsx("w-48 rotate-2 rounded-md p-2 text-sm font-semibold shadow-lift", POSTIT_COLORS[active.priority])}>
              <span className="font-hand text-lg leading-5">{active.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="mt-3 text-xs text-slate-400">
        Arraste um post-it para um horário. Clique num espaço vazio para criar uma tarefa ali. Arraste um bloco de volta para a lista para tirar o horário.
      </p>
    </div>
  );
}

function SlotCell({
  id,
  day,
  time,
  index,
  tabbable,
  isPast,
  onFocus,
  onKeyDown,
  onCreate,
}: {
  id: string;
  day: string;
  time: string;
  index: number;
  tabbable: boolean;
  isPast: boolean;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onCreate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot|${day}|${time}` });
  const bonus = index >= BONUS_START_HOUR * 2 && index < BONUS_END_HOUR * 2;
  return (
    <button
      ref={setNodeRef}
      id={id}
      type="button"
      tabIndex={tabbable ? 0 : -1}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onClick={onCreate}
      aria-label={`${spokenDate(day)}, ${time}${bonus ? ", pontos em dobro" : ""}. Criar tarefa`}
      style={{ height: ROW_H }}
      className={clsx(
        "group block w-full border-t text-left transition focus-visible:relative focus-visible:z-30",
        index % 2 ? "border-dashed border-white/[0.06]" : "border-white/[0.12]",
        bonus && "bg-amber-300/[0.04]",
        isPast && "bg-black/10",
        isOver ? "bg-violet-500/30 ring-1 ring-inset ring-violet-300/60" : "hover:bg-white/[0.04]"
      )}
    >
      <Plus size={12} aria-hidden="true" className="ml-1 text-slate-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}

const PRIORITY_STRIPE: Record<Task["priority"], string> = {
  alta: "border-l-rose-700",
  media: "border-l-amber-700",
  baixa: "border-l-emerald-700",
};
const PRIORITY_LETTER: Record<Task["priority"], string> = { alta: "A", media: "M", baixa: "B" };
const stop = {
  onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
};

function Block({
  task,
  day,
  top,
  height,
  left,
  width,
  compact,
  narrow,
  onToggle,
  onOpen,
}: {
  task: Task;
  day: string;
  top: number;
  height: number;
  left: number;
  width: number;
  compact: boolean;
  narrow: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `blk|${task._id}|${day}`,
    data: { task, day },
  });
  // mouse/toque arrastam pelo bloco todo; teclado arrasta pela alça (sem botões aninhados)
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  const done = isDoneOn(task, day);
  const earned = isRecurring(task) ? task.completions?.find((c) => c.date === day)?.points : task.pointsEarned;
  const short = height <= ROW_H;
  const spoken = spokenTask(task);
  return (
    <div
      ref={setNodeRef}
      {...pointerListeners}
      style={{ top: top + 1, height: height - 2, left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }}
      className={clsx(
        "group absolute z-10 flex cursor-grab touch-none select-none gap-1 overflow-hidden rounded-md border-l-4 py-0.5 pl-1 pr-1 shadow-postit active:cursor-grabbing",
        POSTIT_COLORS[task.priority],
        PRIORITY_STRIPE[task.priority],
        short ? "items-center" : "items-start",
        done && "opacity-60",
        isDragging && "opacity-30"
      )}
    >
      <button
        type="button"
        {...stop}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-pressed={done}
        aria-label={`${done ? "Reabrir" : "Concluir"} ${task.title}`}
        className={clsx("grid shrink-0 place-items-center rounded", narrow ? "h-5 w-4" : "-m-0.5 h-6 w-6")}
      >
        <span
          className={clsx(
            "grid h-4 w-4 place-items-center rounded border-2",
            done ? "border-emerald-800 bg-emerald-700 text-white" : "border-black/60 bg-white/50"
          )}
        >
          {done && <Check size={11} strokeWidth={3} aria-hidden="true" />}
        </span>
      </button>
      <button
        type="button"
        {...stop}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        aria-label={`Editar: ${spoken}${done ? ", concluída" : ""}`}
        className="min-w-0 flex-1 self-stretch rounded text-left"
      >
        <p className={clsx("truncate text-[13px] font-semibold leading-4", done && "line-through")}>
          <span className="mr-1 rounded bg-black/15 px-1 text-[10px] font-bold" aria-hidden="true">
            {PRIORITY_LETTER[task.priority]}
          </span>
          {task.title}
        </p>
        {!short && !compact && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] leading-4 opacity-80" aria-hidden="true">
            <span className="tabular-nums">
              {task.startTime}–{endTime(task.startTime as string, task.duration)}
            </span>
            <span className="flex items-center gap-0.5 font-semibold">
              <Coins size={10} /> {done && earned != null ? `+${earned}` : basePoints(task)}
            </span>
            <span>{PRIORITY_LABEL[task.priority]}</span>
            {isRecurring(task) && <Repeat size={10} />}
          </p>
        )}
      </button>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined}
        aria-label={`Mover: ${spoken}`}
        className="absolute inset-y-0 right-0 grid w-5 cursor-grab place-items-center rounded-r bg-inherit opacity-0 transition group-hover:opacity-80 focus-visible:opacity-100"
      >
        <GripVertical size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

function Unscheduled({ tasks, onAdd }: { tasks: Task[]; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unscheduled" });
  return (
    <aside
      ref={setNodeRef}
      className={clsx(
        "glass board-grid flex flex-col p-4 transition lg:sticky lg:top-6 lg:max-h-[calc(100vh-120px)]",
        isOver && "border-violet-400/50 ring-2 ring-violet-400/30"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <StickyNote size={17} className="text-amber-300" aria-hidden="true" />
        <h2 className="font-medium text-white">Sem horário</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{tasks.length}</span>
        <div className="flex-1" />
        <button onClick={onAdd} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Nova tarefa">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0">
        {tasks.map((t) => (
          <MiniPostIt key={t._id} task={t} />
        ))}
        {tasks.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Todos os post-its têm horário.</p>}
      </div>
    </aside>
  );
}

function MiniPostIt({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `un|${task._id}`, data: { task } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Mover: ${spokenTask(task)}`}
      className={clsx(
        "w-44 shrink-0 cursor-grab touch-none select-none rounded-sm border-l-4 p-3 shadow-postit active:cursor-grabbing lg:w-auto",
        POSTIT_COLORS[task.priority],
        PRIORITY_STRIPE[task.priority],
        isDragging && "opacity-30"
      )}
    >
      <p className="font-hand text-xl font-bold leading-5">{task.title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] font-medium">
        <span className="flex items-center gap-1 rounded-full bg-black/15 px-2 py-0.5">
          <Coins size={11} /> {basePoints(task)}
        </span>
        <span className="rounded-full bg-black/10 px-2 py-0.5">{PRIORITY_LABEL[task.priority]}</span>
        {isRecurring(task) && (
          <span className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5">
            <Repeat size={11} /> {recurrenceLabel(task.recurrence)}
          </span>
        )}
      </div>
    </div>
  );
}
