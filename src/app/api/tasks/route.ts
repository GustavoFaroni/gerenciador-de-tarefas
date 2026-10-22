import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TaskModel } from "@/models/Task";
import { taskCreateSchema } from "@/lib/validators";
import { ok, fail, handleError } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";
import { assertDailySlot, DailyLimitError } from "@/lib/daily";

export const dynamic = "force-dynamic";

// GET /api/tasks?goalId=...&dailyDate=YYYY-MM-DD&status=pendente&priority=alta
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const filter: Record<string, unknown> = { userId };
    for (const key of ["goalId", "dailyDate", "status", "priority"]) {
      const v = sp.get(key);
      if (v) filter[key] = v;
    }
    const tasks = await TaskModel.find(filter).sort({ createdAt: -1 }).lean();
    return ok(tasks);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const data = taskCreateSchema.parse(await req.json());
    if (data.dailyDate) await assertDailySlot(data.dailyDate, userId);
    const task = await TaskModel.create({ ...data, userId });
    return ok(task, 201);
  } catch (e) {
    if (e instanceof DailyLimitError) return fail(e.message, 409);
    return handleError(e);
  }
}
