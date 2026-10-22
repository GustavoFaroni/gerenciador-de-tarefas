import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

/** Retorna o id do usuário logado (ou null se não houver sessão). */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
