export type Priority = "alta" | "media" | "baixa";
export type TaskStatus = "pendente" | "concluida";
/** Coluna exibida no quadro. "atrasada" é calculada: pendente + prazo vencido. */
export type BoardColumn = "pendente" | "atrasada" | "concluida";

export type RecurrenceFreq = "none" | "daily" | "weekly";
export interface Recurrence {
  freq: RecurrenceFreq;
  days?: number[]; // 0=dom ... 6=sáb (para "weekly")
  start?: string | null; // AAAA-MM-DD a partir de quando vale
  until?: string | null;
}
export interface Completion {
  date: string; // ocorrência (AAAA-MM-DD)
  at: string; // quando foi concluída
  points: number;
  doubled: boolean;
}

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
  // calendário e pontuação
  points?: number | null; // null = padrão da prioridade
  scheduledDate?: string | null; // AAAA-MM-DD (tarefas avulsas)
  startTime?: string | null; // "HH:MM" em blocos de 30 min
  duration?: number; // nº de blocos de 30 min
  recurrence?: Recurrence;
  completions?: Completion[]; // conclusões de tarefas recorrentes
  pointsEarned?: number | null; // pontos ganhos (tarefa avulsa)
  doubled?: boolean;
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
