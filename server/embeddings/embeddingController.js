import { findSimilarResolvedComplaints } from "./similarityService.js";

/**
 * PHASE-2 ADVISORY EMBEDDING CONTROLLER
 *
 * ROLE:
 * - Validate request input
 * - Delegate similarity detection to similarityService.js
 * - Format governance-safe, officer-friendly responses
 *
 * GOVERNANCE PRINCIPLE:
 * Advisory only. No automated decisions.
 */

export const checkRepeatPattern = async (req, res) => {
  try {
    const { description } = req.body;

    // -----------------------------
    // 1. Input validation
    // -----------------------------
    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Complaint description is required and must be non-empty.",
      });
    }

    // -----------------------------
    // 2. Optional advisory filters
    // -----------------------------
    const ward = req.body.ward || null;
    const predictedCategory = req.body.category || null;
    const complaintId = req.body.complaintId || null;
    
    // Text input: Use description as primary semantic signal
    // If title is provided, include it but description remains primary
    // This ensures consistency with comparison logic (title + description)
    const title = req.body.title || null;
    const inputText = title 
      ? `${title}. ${description}`.trim() 
      : description.trim();

    // -----------------------------
    // 3. Delegate analysis (single source of truth)
    // -----------------------------
    const result = await findSimilarResolvedComplaints(
      inputText,
      ward,
      predictedCategory,
      complaintId
    );

    // -----------------------------
    // 4. Officer-facing response
    // -----------------------------
    const response = {
      success: true,
      isRepeatPattern: result.isRepeatPattern,
      advisoryLevel:
        result.similarComplaints.length > 0
          ? result.similarComplaints[0].advisoryLevel
          : null,

      similarComplaints: result.similarComplaints.map((match) => ({
        complaintId: match.complaintId,
        ward: match.ward,
        category: match.category,
        similarityScore: match.similarityIndicator,
        resolvedAt: match.resolvedAt,
        advisoryLevel: match.advisoryLevel,
        matchedSignals: match.matchedSignals,
        title:
          match.title?.length > 100
            ? match.title.substring(0, 100) + "..."
            : match.title,
      })),

      interpretation: generateInterpretation(result),
      advisoryNote:
        "This is an advisory insight only. Final decisions rest with authorized personnel.",
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ Repeat check error:", error.message);

    return res.status(500).json({
      success: false,
      message:
        "Unable to process repeat pattern check at this time. Please try again later.",
      advisoryNote:
        "This advisory service encountered an error. Normal complaint processing may continue.",
    });
  }
};

/**
 * ENHANCEMENT #5: Governance Output Quality
 * Generate governance-safe, plain English interpretation
 * 
 * Ensures honest advisory levels and accurate interpretations
 * that reflect the actual strength of evidence
 */
const generateInterpretation = (result) => {
  if (!result.isRepeatPattern || result.similarComplaints.length === 0) {
    return "This complaint appears to be distinct from previously resolved issues. No similar patterns were detected in recent records.";
  }

  const count = result.similarComplaints.length;
  const highestMatch = result.similarComplaints[0];
  const advisoryLevel = highestMatch.advisoryLevel;
  const similarityScore = highestMatch.similarityIndicator;
  const signals = highestMatch.matchedSignals;

  let interpretation = `This complaint shows similarity to ${count} previously resolved ${
    count === 1 ? "complaint" : "complaints"
  }. `;

  // ENHANCEMENT #5: Honest and accurate interpretation based on actual evidence
  if (advisoryLevel === "Strong") {
    const signalDetails = [];
    if (signals.semantic) signalDetails.push("high semantic similarity");
    if (signals.keyword) signalDetails.push("keyword alignment");
    if (signals.ward) signalDetails.push("ward alignment");
    
    interpretation += `A strong repeat pattern is indicated based on ${signalDetails.join(", ")} `;
    interpretation += `(similarity score: ${similarityScore.toFixed(2)}). `;
  } else {
    const signalDetails = [];
    if (signals.semantic) signalDetails.push("semantic similarity");
    if (signals.keyword) signalDetails.push("keyword indicators");
    if (signals.ward) signalDetails.push("ward indicators");
    
    interpretation += `A possible repeat pattern is indicated based on ${signalDetails.join(" and ")} `;
    interpretation += `(similarity score: ${similarityScore.toFixed(2)}). `;
  }

  interpretation +=
    "Please review the related complaints listed below to determine whether coordinated or preventive action is required. This insight is advisory in nature.";

  return interpretation;
};
