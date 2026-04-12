import mongoose from "mongoose";

const nodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    failed: { type: Boolean, default: false },
  },
  { _id: false },
);

const designSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    nodes: { type: [nodeSchema], default: [] },
    edges: { type: [[String]], default: [] },
    traffic: {
      users: { type: Number, default: 10000 },
      rps: { type: Number, default: 100 },
    },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Design = mongoose.model("Design", designSchema);
