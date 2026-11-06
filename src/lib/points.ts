import type { Priority, Recurrence, Task } from "@/types";
import { todayISO } from "./dates";

/* ------------------------------------------------------------------ *
 * REGRAS DE PONTUAÇÃO
 * - Cada tarefa vale os pontos definidos nela (campo "points").
 * - Sem valor definido, vale o padrão da prioridade (DEFAULT_POINTS).
 * - Concluída entre 06:00 e 11:59 → vale o DOBRO (BONUS_MULTIPLIER).
 * - Tarefa recorrente pontua uma vez por ocorrência (por dia).
 * ------------------------------------------------------------------ */
export const DEFAULT_POINTS: Record<Priority, number> = { alta: 20, media: 10, baixa: 5 };
export const BONUS_START_HOUR = 6;
export const BONUS_END_HOUR = 12; // exclusivo: até 11:59
export const BONUS_MULTIPLIER = 2;
export const DEFAULT_TZ = "America/Sao_Paulo";

export function basePoints(t: { points?: number | null; priority: Priority }) {
  return typeof t.points === "number" ? t.points : DEFAULT_POINTS[t.priority];
}

export function isBonusHour(hour: number) {
  return hour >= BONUS_START_HOUR && hour < BONUS_END_HOUR;
}

export function scoreFor(t: { points?: number | null; priority: Priority }, hour: number) {
  const doubled = isBonusHour(hour);
  return { points: basePoints(t) * (doubled ? BONUS_MULTIPLIER : 1), doubled };
}

/* ---------------------------- fuso horário ---------------------------- */
export function safeTz(tz?: string | null) {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** Hora (0-23) e data (AAAA-MM-DD) no fuso informado — o servidor da Vercel roda em UTC. */
export function clockIn(tz: string, d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

/* ----------------------------- recorrência ----------------------------- */
export const WEEKDAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
export const WEEKDAYS_LONG = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const WEEKDAYS_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function isRecurring(t: Pick<Task, "recurrence">) {
  return !!t.recurrence && t.recurrence.freq !== "none";
}

function dowOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** A tarefa acontece nesse dia? (recorrentes pela regra; avulsas pelo dia agendado) */
export function occursOn(t: Task, date: string) {
  if (!isRecurring(t)) return t.scheduledDate === date;
  const r = t.recurrence as Recurrence;
  if (r.start && date < r.start) return false;
  if (r.until && date > r.until) return false;
  if (r.freq === "daily") return true;
  return (r.days || []).includes(dowOf(date));
}

export function isDoneOn(t: Task, date = todayISO()) {
  return isRecurring(t) ? (t.completions || []).some((c) => c.date === date) : t.status === "concluida";
}

export function recurrenceLabel(r?: Recurrence | null) {
  if (!r || r.freq === "none") return "";
  if (r.freq === "daily") return "Todo dia";
  const days = [...(r.days || [])].sort();
  if (days.join() === "1,2,3,4,5") return "Dias úteis";
  if (days.length === 7) return "Todo dia";
  if (days.length === 1) return `${days[0] === 0 || days[0] === 6 ? "Todo" : "Toda"} ${WEEKDAYS_FULL[days[0]]}`;
  return days.map((d) => WEEKDAYS_LONG[d]).join(", ");
}

/* ------------------------------- saldos ------------------------------- */
export function earnedOn(tasks: Task[], date: string) {
  let sum = 0;
  for (const t of tasks) {
    if (isRecurring(t)) {
      for (const c of t.completions || []) if (c.date === date) sum += c.points || 0;
    } else if (t.status === "concluida" && t.completedAt && todayISO(new Date(t.completedAt)) === date) {
      sum += t.pointsEarned || 0;
    }
  }
  return sum;
}

export function earnedTotal(tasks: Task[]) {
  let sum = 0;
  for (const t of tasks) {
    if (isRecurring(t)) for (const c of t.completions || []) sum += c.points || 0;
    else if (t.status === "concluida") sum += t.pointsEarned || 0;
  }
  return sum;
}

/* --------------------------- horários (30 min) --------------------------- */
export const SLOT_MIN = 30;
export const SLOTS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
export const slotIndex = (hhmm: string) => SLOTS.indexOf(hhmm);
export function endTime(start: string, duration = 1) {
  const i = slotIndex(start) + duration;
  if (i >= 48) return "24:00";
  return SLOTS[i];
}
export function durationLabel(slots: number) {
  const min = slots * SLOT_MIN;
  if (min < 60) return `${min} min`;
  return min % 60 ? `${Math.floor(min / 60)}h${min % 60}` : `${min / 60}h`;
}

/* ------------------------- resgate de tempo livre ------------------------- */
// Cada REDEEM_POINTS pontos viram REDEEM_MINUTES minutos de tempo livre.
export const REDEEM_POINTS = 60;
export const REDEEM_MINUTES = 30;
/** Quantos blocos de 30 min dá para resgatar com esse saldo */
export const affordableBlocks = (balance: number) => Math.max(0, Math.floor(balance / REDEEM_POINTS));
export function spentTotal(redemptions: { points: number }[]) {
  return redemptions.reduce((s, r) => s + (r.points || 0), 0);
}
export function minutesLabel(min: number) {
  if (min < 60) return `${min} min`;
  return min % 60 ? `${Math.floor(min / 60)}h${min % 60}` : `${min / 60}h`;
}

/** A tarefa já rendeu pontos? (concluída, ou recorrente com alguma ocorrência concluída) */
export const hasPoints = (t: Task) => t.status === "concluida" || (t.completions?.length ?? 0) > 0;
