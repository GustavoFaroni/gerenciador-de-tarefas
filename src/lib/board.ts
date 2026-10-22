import { PRIORITY_WEIGHT, type BoardColumn, type Task } from "@/types";
import { todayISO } from "./dates";

export function columnOf(task: Task, today = todayISO()): BoardColumn {
  if (task.status === "concluida") return "concluida";
  if (task.dueDate && task.dueDate < today) return "atrasada";
  return "pendente";
}

export function sortTasks(a: Task, b: Task) {
  const p = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (p !== 0) return p;
  const da = a.dueDate || "9999-99-99";
  const db = b.dueDate || "9999-99-99";
  if (da !== db) return da < db ? -1 : 1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

/** Rotação "aleatória" estável para cada post-it */
export function tiltOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 50) - 25) / 10; // -2.5deg .. 2.5deg
}
