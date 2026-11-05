import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** Resgate de pontos por tempo livre (60 pts = 30 min) */
const RedemptionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    blocks: { type: Number, required: true, min: 1, max: 16 },
    minutes: { type: Number, required: true },
    points: { type: Number, required: true },
    startAt: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { timestamps: true }
);

export type RedemptionDoc = InferSchemaType<typeof RedemptionSchema>;
export const RedemptionModel: Model<RedemptionDoc> =
  models.Redemption || model<RedemptionDoc>("Redemption", RedemptionSchema);
