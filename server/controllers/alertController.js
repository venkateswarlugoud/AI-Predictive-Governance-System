import Alert from "../models/Alert.js";
import { generateAlerts } from "../services/alertService.js";

/**
 * GET /api/alerts
 * 
 * Retrieves all governance alerts.
 * 
 * Alerts are formal, auditable records for municipal authorities
 * when hotspots or spikes are detected in complaint patterns.
 * 
 * Access: Admin-only (enforced by middleware)
 * 
 * Response format:
 * [
 *   {
 *     "_id": "...",
 *     "alertType": "SPIKE_ALERT",
 *     "ward": "Ward-5",
 *     "category": "Water",
 *     "severity": "Severe",
 *     "referenceScore": 3.0,
 *     "description": "...",
 *     "status": "Open",
 *     "createdAt": "ISO_DATE",
 *     "updatedAt": "ISO_DATE"
 *   }
 * ]
 */
export const getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(alerts);
  } catch (error) {
    console.error("Error in getAllAlerts controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve alerts",
    });
  }
};

/**
 * PUT /api/alerts/:id
 * 
 * Updates the status of a governance alert.
 * 
 * Allows municipal authorities to track alert resolution:
 * - "Open" -> "Acknowledged" -> "Resolved"
 * 
 * Access: Admin-only (enforced by middleware)
 * 
 * Request body:
 * {
 *   "status": "Acknowledged" | "Resolved"
 * }
 */
export const updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !["Acknowledged", "Resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'Acknowledged' or 'Resolved'",
      });
    }

    // Find and update alert
    const alert = await Alert.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    return res.status(200).json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error("Error in updateAlertStatus controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update alert status",
    });
  }
};

/**
 * POST /api/alerts/generate
 * 
 * Manually triggers alert generation.
 * 
 * This endpoint allows municipal authorities to manually trigger
 * alert generation based on current hotspot and spike detections.
 * 
 * Access: Admin-only (enforced by middleware)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "hotspotAlertsCreated": 2,
 *   "spikeAlertsCreated": 1,
 *   "totalAlertsCreated": 3
 * }
 */
export const triggerAlertGeneration = async (req, res) => {
  try {
    const result = await generateAlerts();

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in triggerAlertGeneration controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate alerts",
    });
  }
};

/**
 * PUT /api/alerts/:id/acknowledge
 * 
 * Acknowledges a governance alert.
 * 
 * This represents formal review by municipal authority.
 * Transitions alert status from "Open" to "Acknowledged".
 * Records who acknowledged and when for audit trail.
 * 
 * Governance rules:
 * - Only "Open" alerts can be acknowledged
 * - Prevents duplicate acknowledgements
 * - Records administrative accountability
 * 
 * Access: Admin-only (enforced by middleware)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "alert": { ... }
 * }
 */
export const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the alert
    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    // Validate status transition: Only "Open" alerts can be acknowledged
    if (alert.status !== "Open") {
      return res.status(400).json({
        success: false,
        message: `Cannot acknowledge alert with status "${alert.status}". Only "Open" alerts can be acknowledged.`,
      });
    }

    // Prevent duplicate acknowledgement
    if (alert.acknowledgedBy || alert.acknowledgedAt) {
      return res.status(400).json({
        success: false,
        message: "Alert has already been acknowledged",
      });
    }

    // Update alert: Set status to "Acknowledged" and record acknowledgment details
    const updatedAlert = await Alert.findByIdAndUpdate(
      id,
      {
        status: "Acknowledged",
        acknowledgedBy: req.user._id, // Admin user from JWT middleware
        acknowledgedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      alert: updatedAlert,
    });
  } catch (error) {
    console.error("Error in acknowledgeAlert controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to acknowledge alert",
    });
  }
};

/**
 * PUT /api/alerts/:id/resolve
 * 
 * Resolves a governance alert with official remarks.
 * 
 * This represents formal administrative closure of an alert.
 * Transitions alert status from "Acknowledged" to "Resolved".
 * Requires resolutionNote for accountability and audit trail.
 * 
 * Governance rules:
 * - Only "Acknowledged" alerts can be resolved
 * - resolutionNote is mandatory for formal closure
 * - Prevents skipping workflow states
 * - Records resolution timestamp for audit
 * 
 * Access: Admin-only (enforced by middleware)
 * 
 * Request body:
 * {
 *   "resolutionNote": "Official remarks explaining resolution action"
 * }
 * 
 * Response format:
 * {
 *   "success": true,
 *   "alert": { ... }
 * }
 */
export const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNote } = req.body;

    // Validate resolutionNote is provided (mandatory for governance accountability)
    if (!resolutionNote || resolutionNote.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "resolutionNote is required for alert resolution",
      });
    }

    // Find the alert
    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    // Validate status transition: Only "Acknowledged" alerts can be resolved
    if (alert.status !== "Acknowledged") {
      return res.status(400).json({
        success: false,
        message: `Cannot resolve alert with status "${alert.status}". Only "Acknowledged" alerts can be resolved.`,
      });
    }

    // Prevent duplicate resolution
    if (alert.resolvedAt || alert.resolutionNote) {
      return res.status(400).json({
        success: false,
        message: "Alert has already been resolved",
      });
    }

    // Update alert: Set status to "Resolved" and record resolution details
    const updatedAlert = await Alert.findByIdAndUpdate(
      id,
      {
        status: "Resolved",
        resolutionNote: resolutionNote.trim(),
        resolvedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      alert: updatedAlert,
    });
  } catch (error) {
    console.error("Error in resolveAlert controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to resolve alert",
    });
  }
};