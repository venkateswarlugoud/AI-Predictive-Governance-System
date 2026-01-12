console.log("✅ aiService.js loaded");

import axios from "axios";

const AI_BASE_URL = "http://127.0.0.1:8000";

export const predictComplaint = async (text) => {
  const response = await axios.post(`${AI_BASE_URL}/predict`, { text });
  return response.data;
};
