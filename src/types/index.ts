export type Priority = "alta" | "media" | "baixa";
export type TaskStatus = "pendente" | "concluida";
/** Coluna exibida no quadro. "atrasada" é calculada: pendente + prazo vencido. */
export type BoardColumn = "pendente" | "atrasada" | "concluida";

export interface Task {
  _id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string | null; // YYYY-MM-DD
  goalId?: string | null;
  dailyDate?: string | null; // YYYY-MM-DD em que é meta diária
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  _id: string;
  title: string;
  description?: string;
  deadline?: string | null;
  color: string;
  createdAt: string;
  // agregados retornados pela API
  totalTasks?: number;
  doneTasks?: number;
}

export const PRIORITY_LABEL: Record<Priority, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
export const PRIORITY_WEIGHT: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };
export const DAILY_LIMIT = 3;
