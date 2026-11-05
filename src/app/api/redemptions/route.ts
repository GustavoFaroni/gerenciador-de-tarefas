import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RedemptionModel } from "@/models/Redemption";
import { redemptionCreateSchema } from "@/lib/validators";
import { ok, fail, handleError } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth";
import { getBalance } from "@/lib/balance";
import { REDEEM_MINUTES, REDEEM_POINTS } from "@/lib/points";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const list = await RedemptionModel.find({ userId }).sort({ createdAt: -1 }).limit(200).lean();
    return ok(list);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return fail("Não autenticado", 401);
    await connectDB();
    const { blocks, startNow, note } = redemptionCreateSchema.parse(await req.json());
    const cost = blocks * REDEEM_POINTS;
    const { balance } = await getBalance(userId);
    if (balance < cost) {
      return fail(`Saldo insuficiente: você tem ${balance} pts e precisa de ${cost} pts.`, 409);
    }
    const r = await RedemptionModel.create({
      userId,
      blocks,
      minutes: blocks * REDEEM_MINUTES,
      points: cost,
      startAt: startNow ? new Date() : null,
      note: note ?? "",
    });
    return ok(r, 201);
  } catch (e) {
    return handleError(e);
  }
}
