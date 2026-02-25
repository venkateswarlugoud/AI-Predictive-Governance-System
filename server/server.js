import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { validateSmtpEnv, verifyTransporter } from "./services/notificationService.js";

import userRouter from "./routes/userRoutes.js";
import complaintRouter from "./routes/complaintRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import hotspotRoutes from "./routes/hotspotRoutes.js";
import spikeRoutes from "./routes/spikeRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import embeddingRoutes from "./embeddings/embeddingRoutes.js";
import slaRoutes from "./routes/slaRoutes.js";
import escalationRoutes from "./routes/escalationRoutes.js";
import wardRouter from "./routes/wardRoutes.js";
import { getCities } from "./controllers/wardController.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";
import mapRoutes from "./routes/mapRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Routes
app.use("/api/auth", userRouter);
app.use("/api/complaint", complaintRouter);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/hotspots", hotspotRoutes);
app.use("/api/spikes", spikeRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/embeddings", embeddingRoutes);
app.use("/api/sla", slaRoutes);
app.use("/api/escalation", escalationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/debug", debugRoutes);
app.get("/api/cities", getCities);
app.use("/api/wards", wardRouter);
app.use("/api/map", mapRoutes);

// ---------------------------------------------------------------------------
// SMTP startup: validate env (never log SMTP_PASS), then verify connection
// ---------------------------------------------------------------------------
const { ok: smtpEnvOk, missing: smtpMissing } = validateSmtpEnv();
if (!smtpEnvOk) {
  throw new Error(
    `[STARTUP] Missing required SMTP env: ${smtpMissing.join(", ")}. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.`
  );
}
console.log("[STARTUP] SMTP env loaded:", {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  // SMTP_PASS never logged
});

// Start server after DB connection and SMTP verify
connectDB().then(async () => {
  const smtpVerified = await verifyTransporter();
  if (!smtpVerified) {
    throw new Error("[STARTUP] SMTP connection verify failed. Check credentials and network.");
  }
  app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
  });
});
