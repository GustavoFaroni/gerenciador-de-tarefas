import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { GoalModel } from "@/models/Goal";
import { TaskModel } from "@/models/Task";
import { goalCreateSchema } from "@/lib/validators";
import { ok, fail, handleError } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const goals = await GoalModel.find({ userId }).sort({ createdAt: -1 }).lean();

    // progresso de cada objetivo
    const stats = await TaskModel.aggregate<{ _id: unknown; total: number; done: number }>([
      { $match: { userId, goalId: { $ne: null } } },
      {
        $group: {
          _id: "$goalId",
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "concluida"] }, 1, 0] } },
        },
      },
    ]);
    const map = new Map(stats.map((s) => [String(s._id), s]));
    return ok(
      goals.map((g) => ({
        ...g,
        totalTasks: map.get(String(g._id))?.total ?? 0,
        doneTasks: map.get(String(g._id))?.done ?? 0,
      }))
    );
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const data = goalCreateSchema.parse(await req.json());
    const goal = await GoalModel.create({ ...data, userId });
    return ok(goal, 201);
  } catch (e) {
    return handleError(e);
  }
}
