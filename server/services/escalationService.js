/**
 * Escalation Indicator Service (Read-only, Advisory)
 *
 * GOVERNANCE NOTES:
 * - This module is PURE and does not write to the database.
 * - It only derives advisory escalation indicators from existing signals.
 * - It does NOT change complaint status, assign authorities, or send notifications.
 * - Final escalation decisions remain with authorized municipal officials.
 */

/** Escalation appears only when SLA is Breached; otherwise null (no "Normal"). */
export const ESCALATION_LEVELS = {
  HIGH_RISK: "High Risk",
  ATTENTION: "Attention Required",
  DELAYED_LOW_IMPACT: "Delayed (Low Impact)",
};

/**
 * Normalize SLA status coming from the SLA service.
 *
 * @param {string | null | undefined} slaStatus
 * @returns {"On Track" | "Approaching Breach" | "Breached" | "Closed"}
 */
export const normalizeSlaStatus = (slaStatus) => {
  if (slaStatus === "Breached") return "Breached";
  if (slaStatus === "Approaching Breach") return "Approaching Breach";
  if (slaStatus === "Closed") return "Closed";
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
 * Derive escalation level only when SLA is Breached.
 * Governance signal: does not duplicate priority wording.
 *
 * - If complaint is Resolved or SLA is not Breached → return null (no indicator).
 * - If SLA === "Breached":
 *   - High priority   → "High Risk"
 *   - Medium priority → "Attention Required"
 *   - Low priority    → "Delayed (Low Impact)"
 *
 * @param {Object} params
 * @param {string} [params.complaintStatus] - If "Resolved", escalation is always null.
 * @param {"On Track" | "Approaching Breach" | "Breached" | "Closed"} params.slaStatus
 * @param {"Low" | "Medium" | "High" | string | undefined} params.priority
 * @returns {("High Risk" | "Attention Required" | "Delayed (Low Impact)" | null)}
 */
/** Normalize priority to schema enum (case-insensitive). */
const normalizePriority = (p) => {
  if (p == null || typeof p !== "string") return "Medium";
  const s = p.trim();
  if (s.toLowerCase() === "high") return "High";
  if (s.toLowerCase() === "low") return "Low";
  if (s.toLowerCase() === "medium") return "Medium";
  return "Medium";
};

export const deriveEscalationLevel = ({ complaintStatus, slaStatus, priority }) => {
  if (complaintStatus === "Resolved") {
    return null;
  }

  const normalizedSla = normalizeSlaStatus(slaStatus);
  if (normalizedSla !== "Breached") {
    return null;
  }

  const p = normalizePriority(priority);
  if (p === "High") return ESCALATION_LEVELS.HIGH_RISK;
  if (p === "Medium") return ESCALATION_LEVELS.ATTENTION;
  return ESCALATION_LEVELS.DELAYED_LOW_IMPACT;
};

/**
 * Build a human-readable list of contributing factors.
 *
 * @param {Object} params
 * @param {"On Track" | "Approaching Breach" | "Breached" | "Closed"} params.slaStatus
 * @param {"Low" | "Medium" | "High"} params.priority
 * @param {"Strong" | "Moderate" | "None"} params.repeatStrength
 * @returns {Array<string>}
 */
export const deriveContributingFactors = ({ slaStatus, priority, repeatStrength }) => {
  const factors = [];

  if (slaStatus === "Breached") {
    factors.push("SLA status: Breached");
  } else if (slaStatus === "Closed") {
    factors.push("SLA status: Closed");
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
 * Compute the full escalation indicator payload for a single complaint.
 * Escalation level is null when SLA is On Track or complaint is Resolved (no indicator shown).
 *
 * @param {Object} params
 * @param {Object} params.complaint - Plain object with status, priority
 * @param {{ slaStatus: string }} params.sla
 * @param {{ repeatCount: number }} params.repeatInfo
 * @returns {{
 *   complaintId: string,
 *   escalationLevel: string | null,
 *   slaStatus: string,
 *   priority: string,
 *   repeatPattern: { repeatCount: number, strength: string },
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
    complaintStatus: base.status,
    slaStatus,
    priority,
  });

  const contributingFactors = deriveContributingFactors({
    slaStatus,
    priority,
    repeatStrength,
  });

  const advisoryLabel = "Governance alert to assist administrators.";
  const governanceNote =
    "Escalation does not override status, change priority, or trigger automation. Final decisions remain with authorized officials.";

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

