import axios from "axios";

/**
 * PHASE-2 ADVISORY EMBEDDING SERVICE
 *
 * Generates semantic embeddings ON-THE-FLY.
 * Embeddings are NOT persisted to maintain Phase-1 isolation.
 *
 * GOVERNANCE PRINCIPLE:
 * Embeddings are supporting signals only, not decisions.
 */

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000/predict";

const getAiBaseUrl = () => {
  try {
    const u = new URL(AI_SERVICE_URL);
    return u.origin;
  } catch {
    return "http://127.0.0.1:8000";
  }
};

const EMBEDDING_SERVICE_URL = `${getAiBaseUrl()}/embed`;

/**
 * Generate embedding vector for text
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export const generateEmbedding = async (text) => {
  try {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      throw new Error("Text must be a non-empty string");
    }

    const response = await axios.post(
      EMBEDDING_SERVICE_URL,
      { text: text.trim() },
      { timeout: 10000 }
    );

    if (!response.data || !Array.isArray(response.data.embedding)) {
      throw new Error("Invalid embedding response");
    }

    return response.data.embedding;
  } catch (error) {
    console.error("❌ Embedding service error:", error.message);
    throw new Error(
      "Semantic analysis service is currently unavailable. Please try later."
    );
  }
};
