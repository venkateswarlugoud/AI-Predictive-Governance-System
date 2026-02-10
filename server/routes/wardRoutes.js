import express from "express";
import { getWardsByCity, createWard } from "../controllers/wardController.js";

const wardRouter = express.Router();

// GET /api/wards?city=cityname
wardRouter.get("/", getWardsByCity);

// POST /api/wards
wardRouter.post("/", createWard);

export default wardRouter;
