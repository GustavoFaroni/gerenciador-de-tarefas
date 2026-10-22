import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD");
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(140),
  description: z.string().max(2000).optional(),
  priority: z.enum(["alta", "media", "baixa"]).default("media"),
  dueDate: isoDate.nullable().optional(),
  goalId: objectId.nullable().optional(),
  dailyDate: isoDate.nullable().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  status: z.enum(["pendente", "concluida"]).optional(),
});

export const goalCreateSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(140),
  description: z.string().max(2000).optional(),
  deadline: isoDate.nullable().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

export const goalUpdateSchema = goalCreateSchema.partial();

export const dailySchema = z.object({
  taskId: objectId,
  date: isoDate,
  action: z.enum(["add", "remove"]).default("add"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(100),
});
