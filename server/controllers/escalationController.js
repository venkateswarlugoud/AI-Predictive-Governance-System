import Complaint from "../models/Complaint.js";
import { computeSlaForComplaint } from "../services/slaService.js";
import {
  buildEscalationIndicatorForComplaint,
  deriveEscalationLevel,
  deriveRepeatStrength,
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
    // Focus on active complaints where escalation attention is most relevant
    const activeComplaints = await Complaint.find({
      status: { $ne: "Resolved" },
    }).select("_id priority status createdAt ward category");

    // Build a ward+category → repeatCount map using the same repeat definition
    const repeatBuckets = await Complaint.aggregate([
      {
        $match: {
          status: "Resolved",
          complaintMonth: { $ne: null },
          complaintYear: { $ne: null },
        },
      },
      {
        $group: {
          _id: { ward: "$ward", category: "$category" },
          totalComplaints: { $sum: 1 },
        },
      },
      {
        $project: {
          key: {
            $concat: ["$_id.ward", "||", "$_id.category"],
          },
          repeats: {
            $cond: [
              { $gt: ["$totalComplaints", 1] },
              { $subtract: ["$totalComplaints", 1] },
              0,
            ],
          },
        },
      },
    ]);

    const repeatMap = new Map();
    repeatBuckets.forEach((row) => {
      if (row && typeof row.key === "string") {
        repeatMap.set(row.key, row.repeats || 0);
      }
    });

    let normalCount = 0;
    let attentionRequiredCount = 0;
    let highRiskCount = 0;

    activeComplaints.forEach((doc) => {
      const base = doc.toObject ? doc.toObject() : doc;
      const sla = computeSlaForComplaint(base);
      const slaStatus = normalizeSlaStatus(sla?.slaStatus);
      const priority = base.priority || "Medium";

      const key = `${base.ward}||${base.category}`;
      const repeatCount = repeatMap.has(key) ? repeatMap.get(key) : 0;
      const repeatStrength = deriveRepeatStrength(repeatCount);

      const level = deriveEscalationLevel({
        slaStatus,
        priority,
        repeatStrength,
      });

      if (level === ESCALATION_LEVELS.HIGH_RISK) {
        highRiskCount += 1;
      } else if (level === ESCALATION_LEVELS.ATTENTION) {
        attentionRequiredCount += 1;
      } else {
        normalCount += 1;
      }
    });

    const totalMonitored = activeComplaints.length;

    return res.status(200).json({
      success: true,
      totalMonitored,
      normalCount,
      attentionRequiredCount,
      highRiskCount,
      generatedAt: new Date().toISOString(),
      advisoryLabel: "Advisory Indicator — No Automatic Action",
      governanceNote:
        "Escalation indicators assist officers in identifying risk. Final escalation decisions remain with authorized officials.",
    });
  } catch (error) {
    console.error("❌ ESCALATION SUMMARY ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to compute escalation summary",
    });
  }
};

