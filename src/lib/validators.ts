import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD");
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

const time30 = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, "Horário deve ser HH:00 ou HH:30");

export const recurrenceSchema = z.object({
  freq: z.enum(["none", "daily", "weekly"]),
  days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  start: isoDate.nullable().optional(),
  until: isoDate.nullable().optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(140),
  description: z.string().max(2000).optional(),
  priority: z.enum(["alta", "media", "baixa"]).default("media"),
  dueDate: isoDate.nullable().optional(),
  goalId: objectId.nullable().optional(),
  dailyDate: isoDate.nullable().optional(),
  points: z.number().int().min(0).max(1000).nullable().optional(),
  scheduledDate: isoDate.nullable().optional(),
  startTime: time30.nullable().optional(),
  duration: z.number().int().min(1).max(48).optional(),
  recurrence: recurrenceSchema.optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  status: z.enum(["pendente", "concluida"]).optional(),
  /** ocorrência que está sendo concluída (tarefas recorrentes) */
  date: isoDate.optional(),
  /** fuso do navegador, para aplicar o bônus das 6h-12h no horário certo */
  tz: z.string().max(64).optional(),
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

export const redemptionCreateSchema = z.object({
  blocks: z.number().int().min(1, "Resgate pelo menos 30 min").max(16, "Máximo de 8h por resgate"),
  /** início do tempo livre (ISO). Ausente/null = guardado para depois */
  startAt: z.string().datetime({ offset: true }).nullable().optional(),
  note: z.string().trim().max(80).optional(),
});
