import axios from "axios";

const EMBED_URL = process.env.EMBEDDING_SERVICE_URL || "http://127.0.0.1:8000/embed";

export const getEmbedding = async (text) => {
  const res = await axios.post(EMBED_URL, { text });
  return res.data.embedding;
};

export const cosineSimilarity = (a, b) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
