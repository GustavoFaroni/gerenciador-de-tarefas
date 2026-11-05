import type { Goal, Redemption, Task } from "@/types";

export type TaskUpdate = Partial<Task> & { date?: string };

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`);
  return body as T;
}

export const api = {
  tasks: {
    list: () => req<Task[]>("/api/tasks"),
    create: (data: Partial<Task>) => req<Task>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: TaskUpdate) =>
      req<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      }),
    remove: (id: string) => req<{ deleted: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
  },
  goals: {
    list: () => req<Goal[]>("/api/goals"),
    create: (data: Partial<Goal>) => req<Goal>("/api/goals", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Goal>) =>
      req<Goal>(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string, withTasks = false) =>
      req<{ deleted: boolean }>(`/api/goals/${id}?withTasks=${withTasks}`, { method: "DELETE" }),
  },
  redemptions: {
    list: () => req<Redemption[]>("/api/redemptions"),
    create: (blocks: number, startNow: boolean, note?: string) =>
      req<Redemption>("/api/redemptions", { method: "POST", body: JSON.stringify({ blocks, startNow, note }) }),
    remove: (id: string) => req<{ deleted: boolean }>(`/api/redemptions/${id}`, { method: "DELETE" }),
  },
  daily: {
    set: (taskId: string, date: string, action: "add" | "remove") =>
      req<Task>("/api/daily", { method: "POST", body: JSON.stringify({ taskId, date, action }) }),
  },
};
