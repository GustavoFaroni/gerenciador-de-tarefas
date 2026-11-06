import type { Task } from "@/types";
import { addDays, todayISO } from "./dates";
import { isRecurring, occursOn, slotIndex } from "./points";

export type PendingReview = { task: Task; date: string; start: Date; end: Date };

/** Data local "AAAA-MM-DD" + "HH:MM" → Date no fuso do navegador */
export function localDate(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi, 0, 0);
}

/**
 * Ocorrências do calendário (com horário) cujo horário já terminou e que ainda não foram
 * marcadas como feitas nem como "não fiz". Olha só os últimos `days` dias.
 */
export function pendingReviews(tasks: Task[], now = new Date(), days = 7): PendingReview[] {
  const today = todayISO(now);
  const out: PendingReview[] = [];
  for (let i = days; i >= 0; i--) {
    const date = addDays(today, -i);
    for (const t of tasks) {
      if (!t.startTime || slotIndex(t.startTime) < 0 || !occursOn(t, date)) continue;
      if (todayISO(new Date(t.createdAt)) > date) continue; // não pergunta de antes da tarefa existir
      if (isRecurring(t) ? (t.completions || []).some((c) => c.date === date) : t.status === "concluida") continue;
      if ((t.skips || []).some((s) => s.date === date)) continue;
      const start = localDate(date, t.startTime);
      const end = new Date(start.getTime() + (t.duration || 1) * 30 * 60_000);
      if (end > now) continue;
      out.push({ task: t, date, start, end });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
