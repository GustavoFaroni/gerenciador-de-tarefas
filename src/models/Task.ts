import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    priority: { type: String, enum: ["alta", "media", "baixa"], default: "media", index: true },
    status: { type: String, enum: ["pendente", "concluida"], default: "pendente", index: true },
    dueDate: { type: String, default: null }, // "YYYY-MM-DD"
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", default: null, index: true },
    dailyDate: { type: String, default: null, index: true }, // dia em que é uma das 3 metas
    completedAt: { type: Date, default: null },
    userId: { type: String, default: null, index: true }, // preparado para login futuro
  },
  { timestamps: true }
);

export type TaskDoc = InferSchemaType<typeof TaskSchema>;
export const TaskModel: Model<TaskDoc> = models.Task || model<TaskDoc>("Task", TaskSchema);
