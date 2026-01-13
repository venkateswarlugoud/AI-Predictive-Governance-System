import mongoose from "mongoose";

/**
 * Alert Schema for Governance Alerts
 * 
 * Represents formal, auditable records for municipal authorities
 * when hotspots or spikes are detected in complaint patterns.
 * 
 * This is a deterministic, rule-based alert system suitable for
 * government audit and public administration review.
 */
const alertSchema = new mongoose.Schema(
  {
    alertType: {
      type: String,
      enum: ["HOTSPOT_ALERT", "SPIKE_ALERT"],
      required: true,
      index: true,
    },

    ward: {
      type: String,
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["High", "Severe", "Medium", "Moderate"],
      required: true,
    },

    // Reference score for auditability
    // For hotspots: hotspotScore
    // For spikes: spikeRatio
    referenceScore: {
      type: Number,
      required: true,
    },

    // Human-readable description explaining the alert
    // NO technical jargon, NO ML terminology
    description: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Open", "Acknowledged", "Resolved"],
      default: "Open",
      index: true,
    },

    // Workflow tracking fields for governance accountability
    // Records who acknowledged the alert and when
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    acknowledgedAt: {
      type: Date,
      default: null,
    },

    // Resolution tracking for formal administrative closure
    resolutionNote: {
      type: String,
      default: null,
      trim: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate alerts
// Same ward + category + alertType within 30 days
alertSchema.index(
  { ward: 1, category: 1, alertType: 1, createdAt: -1 },
  { name: "duplicate_prevention_index" }
);

export default mongoose.model("Alert", alertSchema);
