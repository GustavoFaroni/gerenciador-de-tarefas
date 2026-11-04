import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";
import { PRIORITY_LABEL, type Task } from "@/types";
import { basePoints, recurrenceLabel, isRecurring } from "./points";

/** "quarta, 4 de novembro" a partir de AAAA-MM-DD */
export function spokenDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

/** Descrição falada de uma tarefa: título, prioridade, pontos e repetição */
export function spokenTask(t: Task) {
  const parts = [t.title, `prioridade ${PRIORITY_LABEL[t.priority].toLowerCase()}`, `${basePoints(t)} pontos`];
  if (isRecurring(t)) parts.push(recurrenceLabel(t.recurrence).toLowerCase());
  if (t.startTime) parts.push(`às ${t.startTime}`);
  return parts.join(", ");
}

function nameOf(data: unknown) {
  const t = (data as { task?: Task } | undefined)?.task;
  return t?.title ?? "post-it";
}

function placeOf(id: string | number | undefined) {
  const s = String(id ?? "");
  if (!s) return "fora de uma área válida";
  if (s === "unscheduled") return "lista de post-its sem horário";
  if (s.startsWith("slot|")) {
    const [, day, time] = s.split("|");
    return `${spokenDate(day)}, ${time}`;
  }
  const cols: Record<string, string> = { pendente: "coluna Pendentes", atrasada: "coluna Em atraso", concluida: "coluna Concluídas" };
  return cols[s] ?? s;
}

/** Anúncios do arrastar-e-soltar em português (dnd-kit usa inglês por padrão) */
export const dndAnnouncements: Announcements = {
  onDragStart: ({ active }) => `Pegou ${nameOf(active.data.current)}.`,
  onDragOver: ({ active, over }) => `${nameOf(active.data.current)} sobre ${placeOf(over?.id)}.`,
  onDragEnd: ({ active, over }) =>
    over ? `${nameOf(active.data.current)} solto em ${placeOf(over.id)}.` : `${nameOf(active.data.current)} solto fora de uma área. Nada mudou.`,
  onDragCancel: ({ active }) => `Movimento cancelado. ${nameOf(active.data.current)} voltou ao lugar.`,
};

export const dndInstructions: ScreenReaderInstructions = {
  draggable:
    "Para mover, pressione Espaço ou Enter. Use as setas para levar o post-it até o lugar, Espaço ou Enter para soltar e Esc para cancelar.",
};
