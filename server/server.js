import dotenv from "dotenv";
dotenv.config(); // MUST be first

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/userRoutes.js";
import complaintRouter from "./routes/complaintRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true }));

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.use("/api/auth", userRouter);
app.use("/api/complaint", complaintRouter);

// ⛔ DO NOT use top-level await
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`);
  });
});
