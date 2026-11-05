"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type TaskUpdate } from "@/lib/client";
import { earnedTotal, isRecurring, minutesLabel, scoreFor, spentTotal } from "@/lib/points";
import { todayISO } from "@/lib/dates";
import type { Goal, Redemption, Task } from "@/types";
import { useToast } from "./Toast";

type Store = {
  tasks: Task[];
  goals: Goal[];
  redemptions: Redemption[];
  /** pontos ganhos − pontos resgatados */
  balance: number;
  redeem: (blocks: number, startNow: boolean, note?: string) => Promise<boolean>;
  undoRedemption: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, data: TaskUpdate) => Promise<boolean>;
  /** Conclui/reabre a tarefa num dia (recorrentes: a ocorrência daquele dia). */
  setDone: (task: Task, done: boolean, date?: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<void>;
  setDaily: (id: string, date: string | null) => Promise<boolean>;
  createGoal: (data: Partial<Goal>) => Promise<Goal | null>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string, withTasks?: boolean) => Promise<void>;
  goalById: (id?: string | null) => Goal | undefined;
};

const Ctx = createContext<Store | null>(null);
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do StoreProvider");
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [t, g, r] = await Promise.all([api.tasks.list(), api.goals.list(), api.redemptions.list()]);
      setTasks(t);
      setGoals(g);
      setRedemptions(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // recalcula progresso dos objetivos localmente
  const goalsWithStats = useMemo(
    () =>
      goals.map((g) => {
        const own = tasks.filter((t) => t.goalId === g._id);
        return { ...g, totalTasks: own.length, doneTasks: own.filter((t) => t.status === "concluida").length };
      }),
    [goals, tasks]
  );

  const createTask = useCallback(
    async (data: Partial<Task>) => {
      try {
        const t = await api.tasks.create(data);
        setTasks((prev) => [t, ...prev]);
        toast("Tarefa criada", "success");
        return t;
      } catch (e) {
        toast((e as Error).message, "error");
        return null;
      }
    },
    [toast]
  );

  /** Atualização otimista: aplica na tela e desfaz se a API falhar. */
  const updateTask = useCallback(
    async (id: string, data: TaskUpdate) => {
      let snapshot: Task[] = [];
      setTasks((prev) => {
        snapshot = prev;
        return prev.map((t) => (t._id === id ? optimistic(t, data) : t));
      });
      try {
        const saved = await api.tasks.update(id, data);
        setTasks((prev) => prev.map((t) => (t._id === id ? saved : t)));
        return true;
      } catch (e) {
        setTasks(snapshot);
        toast((e as Error).message, "error");
        return false;
      }
    },
    [toast]
  );

  const setDone = useCallback(
    async (task: Task, done: boolean, date?: string) => {
      const res = await updateTask(task._id, { status: done ? "concluida" : "pendente", date: date ?? todayISO() });
      if (res && done) {
        const { points, doubled } = scoreFor(task, new Date().getHours());
        toast(doubled ? `+${points} pts (dobro da manhã!)` : `+${points} pts`, "success");
      }
      return res;
    },
    [updateTask, toast]
  );

  const balance = useMemo(() => earnedTotal(tasks) - spentTotal(redemptions), [tasks, redemptions]);

  const redeem = useCallback(
    async (blocks: number, startNow: boolean, note?: string) => {
      try {
        const r = await api.redemptions.create(blocks, startNow, note);
        setRedemptions((prev) => [r, ...prev]);
        toast(`Resgatado: ${minutesLabel(r.minutes)} de tempo livre (−${r.points} pts)`, "success");
        return true;
      } catch (e) {
        toast((e as Error).message, "error");
        return false;
      }
    },
    [toast]
  );

  const undoRedemption = useCallback(
    async (id: string) => {
      try {
        await api.redemptions.remove(id);
        setRedemptions((prev) => prev.filter((r) => r._id !== id));
        toast("Resgate desfeito, pontos devolvidos", "info");
      } catch (e) {
        toast((e as Error).message, "error");
      }
    },
    [toast]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      let snapshot: Task[] = [];
      setTasks((prev) => {
        snapshot = prev;
        return prev.filter((t) => t._id !== id);
      });
      try {
        await api.tasks.remove(id);
        toast("Tarefa excluída", "info");
      } catch (e) {
        setTasks(snapshot);
        toast((e as Error).message, "error");
      }
    },
    [toast]
  );

  const setDaily = useCallback(
    async (id: string, date: string | null) => {
      const current = tasks.find((t) => t._id === id);
      try {
        const saved = date
          ? await api.daily.set(id, date, "add")
          : await api.daily.set(id, current?.dailyDate || "2000-01-01", "remove");
        setTasks((prev) => prev.map((t) => (t._id === id ? saved : t)));
        return true;
      } catch (e) {
        toast((e as Error).message, "error");
        return false;
      }
    },
    [tasks, toast]
  );

  const createGoal = useCallback(
    async (data: Partial<Goal>) => {
      try {
        const g = await api.goals.create(data);
        setGoals((prev) => [g, ...prev]);
        toast("Objetivo criado", "success");
        return g;
      } catch (e) {
        toast((e as Error).message, "error");
        return null;
      }
    },
    [toast]
  );

  const updateGoal = useCallback(
    async (id: string, data: Partial<Goal>) => {
      try {
        const g = await api.goals.update(id, data);
        setGoals((prev) => prev.map((x) => (x._id === id ? g : x)));
      } catch (e) {
        toast((e as Error).message, "error");
      }
    },
    [toast]
  );

  const deleteGoal = useCallback(
    async (id: string, withTasks = false) => {
      try {
        await api.goals.remove(id, withTasks);
        setGoals((prev) => prev.filter((g) => g._id !== id));
        setTasks((prev) =>
          withTasks ? prev.filter((t) => t.goalId !== id) : prev.map((t) => (t.goalId === id ? { ...t, goalId: null } : t))
        );
        toast("Objetivo excluído", "info");
      } catch (e) {
        toast((e as Error).message, "error");
      }
    },
    [toast]
  );

  const goalById = useCallback((id?: string | null) => goalsWithStats.find((g) => g._id === id), [goalsWithStats]);

  return (
    <Ctx.Provider
      value={{
        tasks,
        goals: goalsWithStats,
        redemptions,
        balance,
        redeem,
        undoRedemption,
        loading,
        error,
        reload,
        createTask,
        updateTask,
        setDone,
        deleteTask,
        setDaily,
        createGoal,
        updateGoal,
        deleteGoal,
        goalById,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Aplica a mudança na tela antes da resposta da API (inclusive conclusões de recorrentes). */
function optimistic(t: Task, data: TaskUpdate): Task {
  const { date, ...rest } = data;
  if (rest.status && isRecurring({ recurrence: rest.recurrence ?? t.recurrence })) {
    const day = date ?? todayISO();
    const { points, doubled } = scoreFor({ ...t, ...rest }, new Date().getHours());
    const others = (t.completions || []).filter((c) => c.date !== day);
    const { status, ...without } = rest;
    return {
      ...t,
      ...without,
      completions: status === "concluida" ? [...others, { date: day, at: new Date().toISOString(), points, doubled }] : others,
    };
  }
  if (rest.status === "concluida" && t.status !== "concluida") {
    const { points, doubled } = scoreFor({ ...t, ...rest }, new Date().getHours());
    return { ...t, ...rest, completedAt: new Date().toISOString(), pointsEarned: points, doubled };
  }
  if (rest.status === "pendente") return { ...t, ...rest, completedAt: null, pointsEarned: null, doubled: false };
  return { ...t, ...rest };
}
