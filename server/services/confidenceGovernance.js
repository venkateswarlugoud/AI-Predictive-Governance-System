/**
 * =======================================
 * CONFIDENCE GOVERNANCE UTILITY
 * =======================================
 * 
 * GOVERNANCE PRINCIPLE:
 * AI predictions must be confidence-aware and auditable.
 * Low confidence predictions require human review.
 * 
 * This utility provides standardized decision governance
 * based on confidence thresholds.
 */

/**
 * Confidence thresholds for decision governance
 * These thresholds are policy-driven and auditable
 */
const CONFIDENCE_THRESHOLDS = {
  CONFIRMED: 0.75,      // High confidence - auto-confirm
  SUGGESTED: 0.55,      // Medium confidence - flag as suggestion
  REQUIRES_REVIEW: 0.55 // Below this - requires human review
};

/**
 * Evaluate confidence and return governance decision
 * 
 * @param {string} prediction - The AI prediction (category or priority)
 * @param {number} confidence - Confidence score (0.0 to 1.0)
 * @returns {Object} Governance decision object
 * 
 * @example
 * evaluateConfidence("Electricity", 0.85)
 * // Returns: {
 * //   decisionStatus: "AI_CONFIRMED",
 * //   requiresHumanReview: false
 * // }
 */
export const evaluateConfidence = (prediction, confidence) => {
  // Validate inputs
  if (!prediction || typeof prediction !== 'string') {
    return {
      decisionStatus: "INVALID_INPUT",
      requiresHumanReview: true,
      reason: "Invalid prediction input"
    };
  }

  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    return {
      decisionStatus: "INVALID_CONFIDENCE",
      requiresHumanReview: true,
      reason: "Invalid confidence score"
    };
  }

  // Handle "Uncertain" predictions (from AI service)
  if (prediction === "Uncertain") {
    return {
      decisionStatus: "REQUIRES_REVIEW",
      requiresHumanReview: true,
      reason: "AI returned uncertain prediction"
    };
  }

  // Apply confidence thresholds
  if (confidence >= CONFIDENCE_THRESHOLDS.CONFIRMED) {
    return {
      decisionStatus: "AI_CONFIRMED",
      requiresHumanReview: false,
      reason: "High confidence prediction"
    };
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.SUGGESTED) {
    return {
      decisionStatus: "AI_SUGGESTED",
      requiresHumanReview: false,
      reason: "Medium confidence prediction - advisory only"
    };
  }

  // Low confidence - requires review
  return {
    decisionStatus: "REQUIRES_REVIEW",
    requiresHumanReview: true,
    reason: "Low confidence prediction requires human verification"
  };
};

/**
 * Get confidence thresholds for reference/logging
 */
export const getConfidenceThresholds = () => {
  return { ...CONFIDENCE_THRESHOLDS };
};
