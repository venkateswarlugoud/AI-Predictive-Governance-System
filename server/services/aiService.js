console.log("✅ aiService.js loaded");

import axios from "axios";

// Use environment variable or default to localhost:8000
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000/predict";

export const predictComplaint = async (text) => {
  const response = await axios.post(AI_SERVICE_URL, { text });
  return response.data;
};
