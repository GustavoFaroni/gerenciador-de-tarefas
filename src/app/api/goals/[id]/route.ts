import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { GoalModel } from "@/models/Goal";
import { TaskModel } from "@/models/Task";
import { goalUpdateSchema } from "@/lib/validators";
import { ok, fail, handleError, isValidId } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    if (!isValidId(params.id)) return fail("ID inválido", 400);
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const data = goalUpdateSchema.parse(await req.json());
    const goal = await GoalModel.findOneAndUpdate({ _id: params.id, userId }, data, { new: true }).lean();
    if (!goal) return fail("Objetivo não encontrado", 404);
    return ok(goal);
  } catch (e) {
    return handleError(e);
  }
}

// DELETE /api/goals/:id?withTasks=true  -> apaga também as tarefas; senão apenas desvincula
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    if (!isValidId(params.id)) return fail("ID inválido", 400);
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const res = await GoalModel.deleteOne({ _id: params.id, userId });
    if (!res.deletedCount) return fail("Objetivo não encontrado", 404);
    if (req.nextUrl.searchParams.get("withTasks") === "true") {
      await TaskModel.deleteMany({ goalId: params.id, userId });
    } else {
      await TaskModel.updateMany({ goalId: params.id, userId }, { goalId: null });
    }
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
