import Complaint from "../models/Complaint.js";
import { generateEmbedding } from "./embeddingService.js";

/**
 * PHASE-2 ADVISORY SIMILARITY SERVICE (GOVERNMENT-GRADE)
 *
 * PURPOSE:
 * Identify potential repeat complaint patterns using
 * multiple conservative, explainable signals.
 *
 * GOVERNANCE GUARANTEES:
 * - Advisory only (no automation)
 * - Semantic similarity is mandatory
 * - Supporting signals refine confidence
 * - Explainable to officers
 * - No database mutation
 */

const SEMANTIC_MIN_THRESHOLD = 0.60;
const SEMANTIC_STRONG_THRESHOLD = 0.75;

const MAX_COMPARISONS = 20;
const HISTORICAL_WINDOW_MS = 6 * 30 * 24 * 60 * 60 * 1000;

/**
 * Category-specific anchor keywords
 * (Explainable rule layer)
 */
const ANCHOR_KEYWORDS = {
  Water: ["leak", "leakage", "pipe", "overflow", "water"],
  Sanitation: ["garbage", "waste", "sewage", "drain", "overflow"],
  Roads: ["pothole", "road", "crack", "highway", "damage"],
  Electricity: ["power", "voltage", "transformer", "line", "outage"],
};

/**
 * Check keyword anchor overlap
 */
const hasAnchorOverlap = (textA, textB, category) => {
  const anchors = ANCHOR_KEYWORDS[category] || [];
  return anchors.some(
    (word) => textA.includes(word) && textB.includes(word)
  );
};

/**
 * Compute cosine similarity
 */
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0,
    normA = 0,
    normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
};

/**
 * Find semantically similar resolved complaints (ADVISORY)
 *
 * SINGLE SOURCE OF TRUTH
 */
export const findSimilarResolvedComplaints = async (
  description,
  ward = null,
  predictedCategory = null,
  excludeComplaintId = null
) => {
  const sinceDate = new Date(Date.now() - HISTORICAL_WINDOW_MS);

  // AUDIT CHECK #2: Complaint set validation
  // CRITICAL: Only compare against RESOLVED complaints
  // NEW and IN-PROGRESS complaints are excluded to prevent false positives
  // Only resolved complaints represent completed cases suitable for repeat pattern detection
  const query = {
    status: "Resolved", // MANDATORY: Only resolved complaints for repeat detection
    createdAt: { $gte: sinceDate },
  };

  // CRITICAL: Do NOT filter by ward at query level
  // Semantic similarity must work ACROSS different wards
  // Ward matching is ONLY used as a supporting signal in scoring logic

  // AUDIT CHECK #5: Self-match protection
  // Prevent self-matching: exclude the current complaint from comparison
  // This defensive check ensures a complaint is never compared with itself
  if (excludeComplaintId) {
    query._id = { $ne: excludeComplaintId };
  }

  const resolvedComplaints = await Complaint.find(query)
    .select("_id title description category ward createdAt")
    .sort({ createdAt: -1 })
    .limit(MAX_COMPARISONS);

  if (resolvedComplaints.length === 0) {
    return { isRepeatPattern: false, similarComplaints: [] };
  }

  // ENHANCEMENT #1: Semantic Stability
  // Cache embeddings within request scope to avoid unnecessary regeneration
  // This improves performance and ensures consistent embeddings for the same text
  const embeddingCache = new Map();

  // Input text processing: description is primary semantic signal
  // Note: If title was included in description parameter, it's already combined
  // This ensures consistency: we compare input (description or title+description) 
  // against resolved complaints (title + description)
  const inputText = description.toLowerCase();
  
  // Generate input embedding once and cache it
  const inputEmbeddingKey = `input:${description}`;
  let inputEmbedding = embeddingCache.get(inputEmbeddingKey);
  if (!inputEmbedding) {
    inputEmbedding = await generateEmbedding(description);
    embeddingCache.set(inputEmbeddingKey, inputEmbedding);
  }

  const matches = [];

  for (const complaint of resolvedComplaints) {
    // Defensive self-check
    if (
      excludeComplaintId &&
      complaint._id.toString() === excludeComplaintId.toString()
    ) {
      continue;
    }

    // ENHANCEMENT #3: False Positive Reduction - Category Mismatch Protection
    // If category is provided, ensure it matches before proceeding
    // This prevents false positives from category-only matches with weak semantic similarity
    if (predictedCategory && complaint.category !== predictedCategory) {
      continue;
    }

    // AUDIT CHECK #1: Text input validation
    // Use BOTH title and description for comparison (description is primary semantic signal)
    // This ensures comprehensive semantic matching against historical complaints
    // Title provides context, description provides detailed semantic meaning
    const complaintText = `${complaint.title || ""} ${complaint.description || ""}`
      .toLowerCase()
      .trim();

    // Defensive check: Skip if complaint has no text content
    if (!complaintText) continue;

    // ENHANCEMENT #1: Semantic Stability - Reuse cached embeddings
    // Generate embedding only if not already cached
    const complaintEmbeddingKey = `complaint:${complaint._id.toString()}:${complaintText}`;
    let complaintEmbedding = embeddingCache.get(complaintEmbeddingKey);
    if (!complaintEmbedding) {
      complaintEmbedding = await generateEmbedding(complaintText);
      embeddingCache.set(complaintEmbeddingKey, complaintEmbedding);
    }

    const similarity = cosineSimilarity(inputEmbedding, complaintEmbedding);

    // ENHANCEMENT #3: False Positive Reduction - Strict Semantic Requirement
    // AUDIT CHECK #3: Semantic priority enforcement
    // PRIMARY SIGNAL: Semantic similarity (MANDATORY - hard requirement)
    // A complaint is considered similar ONLY if semantic similarity meets minimum threshold
    // This ensures meaning-first AI: semantic similarity is the gatekeeper
    // Reject matches with semantic similarity < 0.60 regardless of other signals
    const semanticMatch = similarity >= SEMANTIC_MIN_THRESHOLD;
    
    // AUDIT CHECK #4: Multi-signal logic enforcement
    // If semantic similarity is insufficient, reject immediately
    // Ward and keyword matches CANNOT replace semantic similarity requirement
    // This prevents false positives from location-based or keyword-only matches
    if (!semanticMatch) {
      continue;
    }

    // AUDIT CHECK #4: Multi-signal logic (supporting signals)
    // SUPPORTING SIGNALS: Keyword and ward matches (optional, confidence boosters only)
    // These signals ONLY refine confidence AFTER semantic similarity is established
    // They cannot create a match on their own - semantic similarity is mandatory
    const anchorMatch = hasAnchorOverlap(
      inputText,
      complaintText,
      complaint.category
    );
    
    // ENHANCEMENT #4: Cross-Ward Semantics
    // Ward match: Compare input ward with complaint ward
    // Note: ward may be null (not provided), in which case wardMatch is false
    // This ensures ward matching is NEVER required, only supportive
    // Ward match alone CANNOT cause a match (already rejected above if semanticMatch is false)
    // CRITICAL: Strong semantic similarity works ACROSS DIFFERENT WARDS
    // Same ward must NOT override weak meaning (semanticMatch check already enforces this)
    const wardMatch = (ward && complaint.ward) ? complaint.ward === ward : false;

    // Count supporting signals (keyword OR ward)
    // These signals can boost confidence but cannot create a match on their own
    const supportSignals = [anchorMatch, wardMatch].filter(Boolean).length;

    /**
     * GOVERNMENT-GRADE ACCEPTANCE RULE (MEANING-FIRST AI)
     *
     * A match is valid ONLY IF:
     *   1. Semantic similarity >= minimum threshold (MANDATORY - hard requirement)
     *   AND
     *   2. Either:
     *      a. Semantic similarity >= strong threshold (strong semantic alone is sufficient)
     *      OR
     *      b. At least ONE supporting signal (keyword OR ward) is true
     *
     * CRITICAL GUARANTEES:
     * - Semantic similarity is PRIMARY and MANDATORY
     * - Ward match alone CANNOT cause a match (already rejected above if semanticMatch is false)
     * - Keyword + ward without semantic similarity CANNOT cause a match (already rejected above)
     * - Strong semantic similarity works ACROSS DIFFERENT WARDS (ward not in query filter)
     * - Same meaning + different ward → detected (Possible/Strong)
     * - Same ward + different meaning → NOT detected (semanticMatch check rejects)
     * - Keyword overlap without semantic similarity → NOT detected (semanticMatch check rejects)
     */
    const isValidRepeat =
      semanticMatch && // Already checked above, but kept for clarity
      (
        similarity >= SEMANTIC_STRONG_THRESHOLD || // Strong semantic alone is sufficient
        supportSignals >= 1 // Moderate semantic needs at least ONE support signal
      );

    if (!isValidRepeat) continue;

    // ENHANCEMENT #2: Signal Weighting - Explainable Advisory Level Determination
    // Advisory levels reflect signal strength honestly and are explainable to officers
    //
    // ADVISORY LEVEL RULES (EXPLAINABLE):
    // - "Strong": High confidence repeat pattern
    //   → Requires: Semantic similarity >= 0.75 AND at least 2 supporting signals (keyword + ward)
    //   → OR: Semantic similarity >= 0.80 (very strong semantic alone)
    //
    // - "Possible": Moderate confidence repeat pattern
    //   → Requires: Semantic similarity >= 0.60 AND at least 1 supporting signal
    //   → OR: Semantic similarity >= 0.75 but fewer than 2 supporting signals
    //
    // This ensures advisory levels accurately reflect the strength of evidence
    // and prevent misleading interpretations
    let advisoryLevel = "Possible";
    
    // Strong advisory: Very high semantic similarity OR strong semantic + multiple supports
    if (similarity >= 0.80) {
      // Very strong semantic similarity alone warrants "Strong" advisory
      advisoryLevel = "Strong";
    } else if (similarity >= SEMANTIC_STRONG_THRESHOLD && supportSignals >= 2) {
      // Strong semantic (0.75+) with both keyword and ward matches
      advisoryLevel = "Strong";
    } else if (similarity >= SEMANTIC_STRONG_THRESHOLD && supportSignals >= 1) {
      // Strong semantic with at least one supporting signal
      // Still "Possible" to be conservative, but high confidence
      advisoryLevel = "Possible";
    } else {
      // Moderate semantic (0.60-0.75) with at least one supporting signal
      advisoryLevel = "Possible";
    }

    matches.push({
      complaintId: complaint._id.toString(),
      title: complaint.title,
      ward: complaint.ward,
      category: complaint.category,
      resolvedAt: complaint.createdAt,
      similarityIndicator: Number(similarity.toFixed(3)),
      matchedSignals: {
        semantic: semanticMatch,
        keyword: anchorMatch,
        ward: wardMatch,
      },
      advisoryLevel,
    });
  }

  matches.sort((a, b) => b.similarityIndicator - a.similarityIndicator);

  return {
    isRepeatPattern: matches.length > 0,
    similarComplaints: matches,
  };
};
