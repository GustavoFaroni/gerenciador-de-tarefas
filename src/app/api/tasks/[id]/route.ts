import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TaskModel } from "@/models/Task";
import { taskUpdateSchema } from "@/lib/validators";
import { ok, fail, handleError, isValidId } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";
import { assertDailySlot, DailyLimitError } from "@/lib/daily";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    if (!isValidId(params.id)) return fail("ID inválido", 400);
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const data = taskUpdateSchema.parse(await req.json());

    if (data.dailyDate) await assertDailySlot(data.dailyDate, userId, params.id);

    const update: Record<string, unknown> = { ...data };
    if (data.status === "concluida") update.completedAt = new Date();
    if (data.status === "pendente") update.completedAt = null;

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
