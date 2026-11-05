import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RedemptionModel } from "@/models/Redemption";
import { ok, fail, handleError, isValidId } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";

/** Desfazer um resgate: só nos primeiros 10 minutos (para corrigir um clique errado) */
const UNDO_WINDOW_MS = 10 * 60 * 1000;

type Ctx = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    if (!isValidId(params.id)) return fail("ID inválido", 400);
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const r = await RedemptionModel.findOne({ _id: params.id, userId });
    if (!r) return fail("Resgate não encontrado", 404);
    if (Date.now() - new Date(r.get("createdAt")).getTime() > UNDO_WINDOW_MS) {
      return fail("Só dá para desfazer um resgate nos primeiros 10 minutos.", 409);
    }
    await r.deleteOne();
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
