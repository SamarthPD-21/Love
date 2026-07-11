import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import memoryRoutes from "./routes/memories";
import albumRoutes from "./routes/albums";
import uploadRoutes from "./routes/upload";
import letterRoutes from "./routes/letters";
import openWhenRoutes from "./routes/open-when";
import voiceRoutes from "./routes/voice-notes";
import countdownRoutes from "./routes/countdowns";
import timelineRoutes from "./routes/timeline";
import dailyRoutes from "./routes/daily";
import memoryJarRoutes from "./routes/memory-jar";
import gratitudeRoutes from "./routes/gratitude";
import dreamsRoutes from "./routes/dreams";
import songsRoutes from "./routes/songs";
import moviesRoutes from "./routes/movies";
import mapRoutes from "./routes/map";
import journalRoutes from "./routes/journal";
import statsRoutes from "./routes/stats";

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/memories", memoryRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/letters", letterRoutes);
app.use("/api/open-when", openWhenRoutes);
app.use("/api/voice-notes", voiceRoutes);
app.use("/api/countdowns", countdownRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/daily", dailyRoutes);
app.use("/api/memory-jar", memoryJarRoutes);
app.use("/api/gratitude", gratitudeRoutes);
app.use("/api/dreams", dreamsRoutes);
app.use("/api/songs", songsRoutes);
app.use("/api/movies", moviesRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/stats", statsRoutes);

// ── Health check ────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start ───────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "5000", 10);

async function main() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
