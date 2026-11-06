import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TaskModel } from "@/models/Task";
import { taskUpdateSchema } from "@/lib/validators";
import { ok, fail, handleError, isValidId } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";
import { assertDailySlot, DailyLimitError } from "@/lib/daily";
import { clockIn, safeTz, scoreFor } from "@/lib/points";
import type { Priority } from "@/types";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    if (!isValidId(params.id)) return fail("ID inválido", 400);
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const { tz, date, ...data } = taskUpdateSchema.parse(await req.json());

    if (data.dailyDate) await assertDailySlot(data.dailyDate, userId, params.id);

    const existing = await TaskModel.findOne({ _id: params.id, userId }).lean();
    if (!existing) return fail("Tarefa não encontrada", 404);

    const update: Record<string, unknown> = { ...data };

    if (data.status) {
      const zone = safeTz(tz);
      const now = new Date();
      const clock = clockIn(zone, now);
      const { points, doubled } = scoreFor(
        {
          points: data.points !== undefined ? data.points : (existing.points as number | null),
          priority: (data.priority ?? existing.priority) as Priority,
        },
        clock.hour
      );
      const freq = data.recurrence?.freq ?? existing.recurrence?.freq ?? "none";

      if (freq !== "none") {
        // recorrente: conclui/reabre só a ocorrência do dia, sem mudar o status geral
        const day = date ?? clock.date;
        delete update.status;
        const others = (existing.completions || []).filter((c) => c.date !== day);
        update.completions =
          data.status === "concluida" ? [...others, { date: day, at: now, points, doubled }] : others;
      } else if (data.status === "concluida") {
        if (existing.status !== "concluida") {
          update.completedAt = now;
          update.pointsEarned = points;
          update.doubled = doubled;
        }
      } else {
        update.completedAt = null;
        update.pointsEarned = null;
        update.doubled = false;
      }
    }

    const task = await TaskModel.findOneAndUpdate({ _id: params.id, userId }, update, { new: true }).lean();
    if (!task) return fail("Tarefa não encontrada", 404);
    return ok(task);
  } catch (e) {
    if (e instanceof DailyLimitError) return fail(e.message, 409);
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    if (!isValidId(params.id)) return fail("ID inválido", 400);
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const res = await TaskModel.deleteOne({ _id: params.id, userId });
    if (!res.deletedCount) return fail("Tarefa não encontrada", 404);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
