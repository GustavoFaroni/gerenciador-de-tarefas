import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TaskModel } from "@/models/Task";
import { reviewSchema } from "@/lib/validators";
import { ok, fail, handleError, isValidId } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";
import { clockIn, safeTz, scoreFor } from "@/lib/points";
import type { Priority } from "@/types";

type Ctx = { params: { id: string } };
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Revisão de uma ocorrência do calendário: "fiz" (com horário real e observação) ou "não fiz".
 * Os pontos usam o horário real informado — feito entre 6h e 12h vale o dobro.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    if (!isValidId(params.id)) return fail("ID inválido", 400);
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const { date, done, doneAt, note, tz } = reviewSchema.parse(await req.json());
    const zone = safeTz(tz);
    const now = new Date();
    const today = clockIn(zone, now).date;
    if (date > today) return fail("Não dá para revisar um dia que ainda não chegou.", 422);

    const t = await TaskModel.findOne({ _id: params.id, userId }).lean();
    if (!t) return fail("Tarefa não encontrada", 404);
    const recurring = (t.recurrence?.freq ?? "none") !== "none";
    if (!recurring && t.scheduledDate !== date) return fail("Essa tarefa não estava agendada nesse dia.", 422);

    const skips = (t.skips || []).filter((s) => s.date !== date);
    const update: Record<string, unknown> = {};

    if (!done) {
      update.skips = [...skips, { date, note: note ?? "" }];
    } else {
      // quando foi feita: horário informado, senão o horário agendado naquele dia
      let at: Date;
      if (doneAt) {
        at = new Date(doneAt);
        if (at.getTime() > now.getTime() + 5 * 60_000) return fail("O horário em que você fez não pode estar no futuro.", 422);
      } else {
        at = now;
      }
      const c = clockIn(zone, at);
      const hour = doneAt ? c.hour : Number((t.startTime || `${pad(c.hour)}:00`).slice(0, 2));
      const time = doneAt ? `${pad(c.hour)}:${pad(c.minute)}` : t.startTime ?? null;
      const { points, doubled } = scoreFor({ points: t.points as number | null, priority: t.priority as Priority }, hour);

      update.skips = skips;
      if (recurring) {
        if ((t.completions || []).some((x) => x.date === date)) return fail("Essa ocorrência já estava concluída.", 409);
        update.completions = [...(t.completions || []), { date, at, points, doubled, time, note: note ?? "" }];
      } else {
        if (t.status === "concluida") return fail("Essa tarefa já estava concluída.", 409);
        Object.assign(update, {
          status: "concluida",
          completedAt: at,
          pointsEarned: points,
          doubled,
          doneTime: time,
          reviewNote: note ?? "",
          // feita em outro horário: o bloco vai para o horário real (arredondado para 30 min)
          ...(doneAt && c.date === date ? { startTime: `${pad(c.hour)}:${c.minute < 30 ? "00" : "30"}` } : {}),
        });
      }
    }

    const task = await TaskModel.findOneAndUpdate({ _id: params.id, userId }, update, { new: true }).lean();
    return ok(task);
  } catch (e) {
    return handleError(e);
  }
}
