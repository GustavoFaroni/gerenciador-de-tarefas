import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { TaskModel } from "@/models/Task";
import { GoalModel } from "@/models/Goal";
import { registerSchema } from "@/lib/validators";
import { ok, fail, handleError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = registerSchema.parse(await req.json());
    await connectDB();

    if (await UserModel.exists({ email })) return fail("Este e-mail já está cadastrado", 409);

    const isFirstUser = (await UserModel.estimatedDocumentCount()) === 0;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ name, email, passwordHash });

    // O primeiro usuário "herda" as tarefas e objetivos criados antes do login existir
    if (isFirstUser) {
      const uid = String(user._id);
      await TaskModel.updateMany({ userId: null }, { userId: uid });
      await GoalModel.updateMany({ userId: null }, { userId: uid });
    }

    return ok({ id: String(user._id), name: user.name, email: user.email }, 201);
  } catch (e) {
    return handleError(e);
  }
}
