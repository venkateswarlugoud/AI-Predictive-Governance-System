import Complaint from "../models/Complaint.js";
import { computeSlaForComplaint } from "../services/slaService.js";
import {
  buildEscalationIndicatorForComplaint,
  deriveEscalationLevel,
  ESCALATION_LEVELS,
  normalizeSlaStatus,
} from "../services/escalationService.js";

/**
 * =======================================
 * ESCALATION BY COMPLAINT (Admin, Read-only)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Advisory indicator only; no automatic escalation is performed.
 * - Does NOT modify complaint status or assign higher authorities.
 * - Uses existing SLA advisory fields and deterministic repeat-pattern logic.
 */
export const getEscalationByComplaintId = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).select(
      "_id priority status createdAt ward category"
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const base = complaint.toObject ? complaint.toObject() : complaint;

    // Reuse existing SLA computation (advisory, in-memory only)
    const sla = computeSlaForComplaint(base);

    // Deterministic repeat definition aligned with repeat analytics:
    // For this complaint's (ward, category), count resolved complaints.
    // Repeat count = max(totalResolved - 1, 0)
    const [{ totalResolved = 0 } = {}] = await Complaint.aggregate([
      {
        $match: {
          ward: base.ward,
          category: base.category,
          status: "Resolved",
        },
      },
      {
        $group: {
          _id: null,
          totalResolved: { $sum: 1 },
        },
      },
    ]);

    const repeatCount = totalResolved > 1 ? totalResolved - 1 : 0;

    const indicator = buildEscalationIndicatorForComplaint({
      complaint: base,
      sla,
      repeatInfo: { repeatCount },
    });

    return res.status(200).json({
      success: true,
      ...indicator,
    });
  } catch (error) {
    console.error("❌ ESCALATION BY COMPLAINT ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to compute escalation indicator for complaint",
    });
  }
};

/**
 * =======================================
 * ESCALATION SUMMARY (Admin, Read-only)
 * =======================================
 *
 * GOVERNANCE NOTES:
 * - Advisory overview only; no automated routing or escalation.
 * - Uses server-time SLA computation and deterministic repeat-pattern buckets.
 * - Does NOT persist any escalation data in the database.
 */
export const getEscalationSummary = async (req, res) => {
  try {
    // Focus on active complaints (Resolved excluded; escalation only when SLA Breached)
    const activeComplaints = await Complaint.find({
      status: { $ne: "Resolved" },
    }).select("_id priority status createdAt ward category");

    let normalCount = 0;
    let attentionRequiredCount = 0;
    let highRiskCount = 0;

    let delayedLowImpactCount = 0;

    activeComplaints.forEach((doc) => {
      const base = doc.toObject ? doc.toObject() : doc;
      const sla = computeSlaForComplaint(base);
      const slaStatus = normalizeSlaStatus(sla?.slaStatus);
      const priority = base.priority || "Medium";

      const level = deriveEscalationLevel({
        complaintStatus: base.status,
        slaStatus,
        priority,
      });

      if (level === ESCALATION_LEVELS.HIGH_RISK) {
        highRiskCount += 1;
      } else if (level === ESCALATION_LEVELS.ATTENTION) {
        attentionRequiredCount += 1;
      } else if (level === ESCALATION_LEVELS.DELAYED_LOW_IMPACT) {
        delayedLowImpactCount += 1;
      } else {
        normalCount += 1;
      }
    });

    const totalMonitored = activeComplaints.length;

    return res.status(200).json({
      success: true,
      totalMonitored,
      noEscalationCount: normalCount,
      delayedLowImpactCount,
      attentionRequiredCount,
      highRiskCount,
      generatedAt: new Date().toISOString(),
      advisoryLabel: "Governance alert to assist administrators.",
      governanceNote:
        "Escalation does not override status, change priority, or trigger automation. Final decisions remain with authorized officials.",
    });
  } catch (error) {
    console.error("❌ ESCALATION SUMMARY ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to compute escalation summary",
    });
  }
};

