import Complaint from "../models/Complaint.js";
import { getEmbedding, cosineSimilarity } from "./embeddingService.js";

export const detectRepeatComplaint = async (text, ward) => {
  const recent = await Complaint.find({
    ward,
    createdAt: {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  }).limit(20);

  if (recent.length === 0) {
    return {
      isRepeated: false,
      similarityScore: 0,
      matchedComplaint: null,
      meaning: "No prior complaints in ward",
    };
  }

  const queryEmbedding = await getEmbedding(text);

  let bestScore = 0;
  let bestMatch = null;

  for (const c of recent) {
    const existingEmbedding =
      c.embedding ?? (await getEmbedding(`${c.title}. ${c.description}`));

    const score = cosineSimilarity(queryEmbedding, existingEmbedding);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = c._id;
    }
  }

  if (bestScore >= 0.6) {
    return {
      isRepeated: true,
      similarityScore: Number(bestScore.toFixed(2)),
      matchedComplaint: bestMatch,
      meaning: "Related complaint detected in same ward",
    };
  }

  return {
    isRepeated: false,
    similarityScore: Number(bestScore.toFixed(2)),
    matchedComplaint: null,
    meaning: "Complaint is distinct",
  };
};
