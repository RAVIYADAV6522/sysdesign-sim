import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true },
    name: { type: String, trim: true },
    picture: { type: String, trim: true },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
