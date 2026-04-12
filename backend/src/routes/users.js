import express from "express";

import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const usersRouter = express.Router();

/** Current user profile (doc: GET /users/me). */
usersRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  });
});
