/**
 * Escalation Indicator Service (Read-only, Advisory)
 *
 * GOVERNANCE NOTES:
 * - This module is PURE and does not write to the database.
 * - It only derives advisory escalation indicators from existing signals.
 * - It does NOT change complaint status, assign authorities, or send notifications.
 * - Final escalation decisions remain with authorized municipal officials.
 */

export const ESCALATION_LEVELS = {
  NORMAL: "Normal",
  ATTENTION: "Attention Required",
  HIGH_RISK: "High Risk",
};

/**
 * Normalize SLA status coming from the SLA service.
 *
 * @param {string | null | undefined} slaStatus
 * @returns {"On Track" | "Approaching Breach" | "Breached"}
 */
export const normalizeSlaStatus = (slaStatus) => {
  if (slaStatus === "Breached") return "Breached";
  if (slaStatus === "Approaching Breach") return "Approaching Breach";
  return "On Track";
};

/**
 * Derive a deterministic repeat-pattern strength bucket.
 *
 * This function is intentionally simple and deterministic:
 * - Strong: repeatCount >= 5
 * - Moderate: repeatCount between 2 and 4
 * - None: repeatCount <= 1 (treated as baseline)
 *
 * @param {number} repeatCount
 * @returns {"Strong" | "Moderate" | "None"}
 */
export const deriveRepeatStrength = (repeatCount = 0) => {
  if (typeof repeatCount !== "number" || !Number.isFinite(repeatCount) || repeatCount <= 1) {
    return "None";
  }
  if (repeatCount >= 5) {
    return "Strong";
  }
  return "Moderate";
};

/**
 * Deterministically derive escalation level from SLA, priority, and repeat strength.
 *
 * Signals used:
 * - SLA Status:
 *   - Breached → baseline High Risk
 *   - Approaching Breach → at least Attention Required
 * - Repeat Pattern:
 *   - Strong → increase risk level by one step
 *   - Moderate → at least Attention Required
 * - Priority:
 *   - High → increase risk level by one step
 *
 * All adjustments are capped at "High Risk" and never downgrade
 * a higher level once reached in this computation.
 *
 * @param {Object} params
 * @param {"On Track" | "Approaching Breach" | "Breached"} params.slaStatus
 * @param {"Low" | "Medium" | "High" | string | undefined} params.priority
 * @param {"Strong" | "Moderate" | "None"} params.repeatStrength
 * @returns {("Normal" | "Attention Required" | "High Risk")}
 */
export const deriveEscalationLevel = ({ slaStatus, priority, repeatStrength }) => {
  const normalizedSla = normalizeSlaStatus(slaStatus);
  const normalizedPriority = priority === "High" || priority === "Low" || priority === "Medium"
    ? priority
    : "Medium";

  // 0 = Normal, 1 = Attention Required, 2 = High Risk
  let levelIndex = 0;

  // SLA is the primary driver
  if (normalizedSla === "Breached") {
    levelIndex = 2;
  } else if (normalizedSla === "Approaching Breach") {
    levelIndex = Math.max(levelIndex, 1);
  }

  // Repeat pattern as structural signal
  if (repeatStrength === "Strong") {
    levelIndex = Math.min(2, levelIndex + 1);
  } else if (repeatStrength === "Moderate") {
    levelIndex = Math.max(levelIndex, 1);
  }

  // Priority as case-level signal
  if (normalizedPriority === "High") {
    levelIndex = Math.min(2, levelIndex + 1);
  }

  if (levelIndex <= 0) return ESCALATION_LEVELS.NORMAL;
  if (levelIndex === 1) return ESCALATION_LEVELS.ATTENTION;
  return ESCALATION_LEVELS.HIGH_RISK;
};

/**
 * Build a human-readable list of contributing factors.
 *
 * NOTE: This is presentational metadata only and does not
 *       trigger any automatic decision-making.
 *
 * @param {Object} params
 * @param {"On Track" | "Approaching Breach" | "Breached"} params.slaStatus
 * @param {"Low" | "Medium" | "High"} params.priority
 * @param {"Strong" | "Moderate" | "None"} params.repeatStrength
 * @returns {Array<string>}
 */
export const deriveContributingFactors = ({ slaStatus, priority, repeatStrength }) => {
  const factors = [];

  if (slaStatus === "Breached") {
    factors.push("SLA status: Breached");
  } else if (slaStatus === "Approaching Breach") {
    factors.push("SLA status: Approaching Breach");
  } else {
    factors.push("SLA status: On Track");
  }

  if (priority === "High") {
    factors.push("Priority level: High priority case");
  } else if (priority === "Medium") {
    factors.push("Priority level: Medium priority case");
  } else {
    factors.push("Priority level: Low priority case");
  }

  if (repeatStrength === "Strong") {
    factors.push("Repeat pattern: Strong historical repeat pattern for this ward and category");
  } else if (repeatStrength === "Moderate") {
    factors.push("Repeat pattern: Some historical repeat pattern for this ward and category");
  } else {
    factors.push("Repeat pattern: No clear historical repeat pattern detected");
  }

  return factors;
};

/**
 * Compute the full escalation indicator payload for a single complaint,
 * given pre-computed SLA and repeat-pattern signals.
 *
 * This function is deterministic and does not perform any I/O.
 *
 * @param {Object} params
 * @param {Object} params.complaint - Plain object (not a Mongoose document)
 * @param {{ slaStatus: string }} params.sla
 * @param {{ repeatCount: number }} params.repeatInfo
 * @returns {{
 *   complaintId: string,
 *   escalationLevel: string,
 *   slaStatus: string,
 *   priority: string,
 *   repeatPattern: {
 *     repeatCount: number,
 *     strength: string
 *   },
 *   contributingFactors: string[],
 *   advisoryLabel: string,
 *   governanceNote: string
 * }}
 */
export const buildEscalationIndicatorForComplaint = ({ complaint, sla, repeatInfo }) => {
  const base = complaint || {};
  const slaStatus = normalizeSlaStatus(sla?.slaStatus);
  const priority = base.priority || "Medium";
  const repeatCount = typeof repeatInfo?.repeatCount === "number" ? repeatInfo.repeatCount : 0;
  const repeatStrength = deriveRepeatStrength(repeatCount);

  const escalationLevel = deriveEscalationLevel({
    slaStatus,
    priority,
    repeatStrength,
  });

  const contributingFactors = deriveContributingFactors({
    slaStatus,
    priority,
    repeatStrength,
  });

  const advisoryLabel = "Advisory Indicator — No Automatic Action";
  const governanceNote =
    "Escalation indicators assist officers in identifying risk. Final escalation decisions remain with authorized officials.";

  return {
    complaintId: String(base._id || ""),
    escalationLevel,
    slaStatus,
    priority,
    repeatPattern: {
      repeatCount,
      strength: repeatStrength,
    },
    contributingFactors,
    advisoryLabel,
    governanceNote,
  };
};

