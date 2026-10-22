import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TaskModel } from "@/models/Task";
import { dailySchema } from "@/lib/validators";
import { ok, fail, handleError } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";
import { assertDailySlot, DailyLimitError } from "@/lib/daily";

export const dynamic = "force-dynamic";

// GET /api/daily?from=YYYY-MM-DD&to=YYYY-MM-DD  -> histórico de metas diárias
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const range: Record<string, string> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    const tasks = await TaskModel.find({
      userId,
      dailyDate: Object.keys(range).length ? range : { $ne: null },
    })
      .sort({ dailyDate: -1 })
      .lean();
    return ok(tasks);
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/daily { taskId, date, action: "add" | "remove" }
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const { taskId, date, action } = dailySchema.parse(await req.json());
    if (action === "add") await assertDailySlot(date, userId, taskId);
    const task = await TaskModel.findOneAndUpdate(
      { _id: taskId, userId },
      { dailyDate: action === "add" ? date : null },
      { new: true }
    ).lean();
    if (!task) return fail("Tarefa não encontrada", 404);
    return ok(task);
  } catch (e) {
    if (e instanceof DailyLimitError) return fail(e.message, 409);
    return handleError(e);
  }
}
