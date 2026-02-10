import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./config/db.js";

import userRouter from "./routes/userRoutes.js";
import complaintRouter from "./routes/complaintRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import hotspotRoutes from "./routes/hotspotRoutes.js";
import spikeRoutes from "./routes/spikeRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import embeddingRoutes from "./embeddings/embeddingRoutes.js";
import wardRouter from "./routes/wardRoutes.js";
import { getCities } from "./controllers/wardController.js";


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
app.get("/api/cities", getCities);
app.use("/api/wards", wardRouter);



// Start server after DB connection
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
  });
});
