import { TaskModel } from "@/models/Task";
import { DAILY_LIMIT } from "@/types";

/** Garante o limite de 3 metas por dia (ignorando a própria tarefa). */
export async function assertDailySlot(date: string, userId: string | null, ignoreTaskId?: string) {
  const filter: Record<string, unknown> = { dailyDate: date, userId };
  if (ignoreTaskId) filter._id = { $ne: ignoreTaskId };
  const count = await TaskModel.countDocuments(filter);
  if (count >= DAILY_LIMIT) {
    throw new DailyLimitError(`Você já definiu ${DAILY_LIMIT} metas para este dia.`);
  }
}

export class DailyLimitError extends Error {}
