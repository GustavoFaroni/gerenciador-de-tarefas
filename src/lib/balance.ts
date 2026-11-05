import { TaskModel } from "@/models/Task";
import { RedemptionModel } from "@/models/Redemption";

/** Saldo do usuário calculado no servidor: pontos ganhos − pontos resgatados */
export async function getBalance(userId: string) {
  const [earned] = await TaskModel.aggregate<{ total: number }>([
    { $match: { userId } },
    {
      $project: {
        avulsa: { $cond: [{ $eq: ["$status", "concluida"] }, { $ifNull: ["$pointsEarned", 0] }, 0] },
        recorrente: { $sum: { $ifNull: ["$completions.points", []] } },
      },
    },
    { $group: { _id: null, total: { $sum: { $add: ["$avulsa", "$recorrente"] } } } },
  ]);
  const [spent] = await RedemptionModel.aggregate<{ total: number }>([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: "$points" } } },
  ]);
  const e = earned?.total ?? 0;
  const s = spent?.total ?? 0;
  return { earned: e, spent: s, balance: e - s };
}
