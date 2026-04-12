import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import passport from "passport";

import { configurePassport, authRouter } from "./routes/auth.js";
import { designsRouter } from "./routes/designs.js";
import { usersRouter } from "./routes/users.js";

/** Load `backend/.env` (`__dirname` is `backend/src`, so go up one level). */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
dotenv.config({
  path: envPath,
  override: true,
});

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

if (!MONGODB_URI?.trim()) {
  console.error(
    "[db] MONGODB_URI is required. Set it in backend/.env (e.g. your Atlas connection string). No default local database is used.",
  );
  process.exit(1);
}

configurePassport();

const app = express();

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(passport.initialize());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "sysdesign-sim-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/designs", designsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("[db] connected:", MONGODB_URI.replace(/\/\/.*@/, "//***@"));

  app.listen(PORT, () => {
    console.log(`[api] http://localhost:${PORT}`);
    console.log(`[cors] ${FRONTEND_URL}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
