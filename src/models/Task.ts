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
    // calendário e pontuação
    points: { type: Number, default: null, min: 0, max: 1000 },
    scheduledDate: { type: String, default: null, index: true }, // "YYYY-MM-DD"
    startTime: { type: String, default: null }, // "HH:MM"
    duration: { type: Number, default: 1, min: 1, max: 48 }, // blocos de 30 min
    recurrence: {
      freq: { type: String, enum: ["none", "daily", "weekly"], default: "none" },
      days: { type: [Number], default: [] },
      start: { type: String, default: null },
      until: { type: String, default: null },
    },
    completions: {
      type: [
        new Schema(
          { date: String, at: Date, points: Number, doubled: Boolean, time: String, note: String },
          { _id: false }
        ),
      ],
      default: [],
    },
    pointsEarned: { type: Number, default: null },
    skips: {
      type: [new Schema({ date: String, note: String }, { _id: false })],
      default: [],
    },
    doneTime: { type: String, default: null },
    reviewNote: { type: String, default: "" },
    doubled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type TaskDoc = InferSchemaType<typeof TaskSchema>;
export const TaskModel: Model<TaskDoc> = models.Task || model<TaskDoc>("Task", TaskSchema);
