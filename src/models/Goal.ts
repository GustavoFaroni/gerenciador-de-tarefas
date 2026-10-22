import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const GoalSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    deadline: { type: String, default: null }, // "YYYY-MM-DD"
    color: { type: String, default: "#8b5cf6" },
    userId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

export type GoalDoc = InferSchemaType<typeof GoalSchema>;
export const GoalModel: Model<GoalDoc> = models.Goal || model<GoalDoc>("Goal", GoalSchema);
