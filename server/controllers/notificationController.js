import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import {
  NOTIFICATION_TYPES,
  sendEmail,
  isWithinNotificationRateLimit,
  buildAcknowledgementEmail,
  buildResolutionConfirmationEmail,
  buildSlaDelayApologyEmail,
  buildStatusUpdateEmail,
} from "../services/notificationService.js";
import { computeSlaForComplaint } from "../services/slaService.js";

/**
 * Admin-safe endpoint to send a notification email for a complaint.
 *
 * POST /api/notifications/send
 *
 * Body:
 * - complaintId (string, required)
 * - type: "ACKNOWLEDGEMENT" | "STATUS_UPDATE" | "SLA_DELAY" | "RESOLUTION"
 *
 * GOVERNANCE NOTES:
 * - Does NOT change complaint status.
 * - Does NOT escalate or auto-resolve complaints.
 * - Enforces per-complaint rate limiting.
 * - SLA apology can only be sent once per complaint and only when SLA is breached.
 */
export const sendNotificationForComplaint = async (req, res) => {
  try {
    const { complaintId, type, previousStatus } = req.body || {};

    if (!complaintId || !type) {
      return res.status(400).json({
        success: false,
        message: "complaintId and type are required.",
      });
    }

    if (!Object.prototype.hasOwnProperty.call(NOTIFICATION_TYPES, type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification type.",
      });
    }

    const complaint = await Complaint.findById(complaintId).populate("user");
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    const user = complaint.user;
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: "Citizen email is not available for this complaint.",
      });
    }

    // Basic per-complaint rate limiting to avoid spam
    const canSend = isWithinNotificationRateLimit(complaint, 15);
    if (!canSend) {
      return res.status(429).json({
        success: false,
        message:
          "Notification recently sent for this complaint. Please wait before sending another email.",
      });
    }

    // Type-specific governance checks
    if (type === NOTIFICATION_TYPES.ACKNOWLEDGEMENT) {
      if (complaint.status !== "New") {
        return res.status(400).json({
          success: false,
          message: "Acknowledgement email can only be sent when complaint is New.",
        });
      }
    }

    if (type === NOTIFICATION_TYPES.STATUS_UPDATE) {
      // Any status other than "New" is allowed; this is an informational update.
      if (!complaint.status) {
        return res.status(400).json({
          success: false,
          message: "Complaint status is not available.",
        });
      }
    }

    if (type === NOTIFICATION_TYPES.RESOLUTION) {
      if (complaint.status !== "Resolved") {
        return res.status(400).json({
          success: false,
          message: "Resolution confirmation can only be sent for resolved complaints.",
        });
      }
    }

    if (type === NOTIFICATION_TYPES.SLA_DELAY) {
      const sla = computeSlaForComplaint(complaint);
      if (!sla || sla.slaStatus !== "Breached") {
        return res.status(400).json({
          success: false,
          message:
            "SLA Delay Apology email can only be sent when the SLA is breached for this complaint.",
        });
      }

      if (complaint.apologySent) {
        return res.status(400).json({
          success: false,
          message: "SLA Delay Apology email has already been sent for this complaint.",
        });
      }
    }

    let emailPayload;
    if (type === NOTIFICATION_TYPES.ACKNOWLEDGEMENT) {
      emailPayload = buildAcknowledgementEmail(complaint, user);
    } else if (type === NOTIFICATION_TYPES.RESOLUTION) {
      emailPayload = buildResolutionConfirmationEmail(complaint, user);
    } else if (type === NOTIFICATION_TYPES.SLA_DELAY) {
      emailPayload = buildSlaDelayApologyEmail(complaint, user);
    } else if (type === NOTIFICATION_TYPES.STATUS_UPDATE) {
      emailPayload = buildStatusUpdateEmail(complaint, user, previousStatus);
    }

    const result = await sendEmail({
      to: user.email,
      subject: emailPayload.subject,
      text: emailPayload.text,
    });

    const success = result.success;

    // Persist minimal metadata & history (no email content stored)
    complaint.lastNotifiedAt = new Date();
    if (type === NOTIFICATION_TYPES.SLA_DELAY && success) {
      complaint.apologySent = true;
    }
    await complaint.save();

    await Notification.create({
      complaint: complaint._id,
      type,
      channel: "EMAIL",
      success,
    });

    if (!success) {
      console.error("❌ NOTIFICATION SEND SMTP ERROR:", result.error);
      return res.status(500).json({
        success: false,
        message: "Failed to send email notification. Logged for review.",
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification email sent successfully.",
    });
  } catch (error) {
    console.error("❌ NOTIFICATION SEND ERROR:", error.code, error.response, error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification email.",
      error: error.message,
    });
  }
};

/**
 * GET /api/notifications/history/:complaintId
 *
 * Returns a minimal history of notifications for a complaint.
 * Does NOT include email content.
 */
export const getNotificationHistory = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId).select(
      "lastNotifiedAt apologySent"
    );
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    const history = await Notification.find({
      complaint: complaintId,
    })
      .sort({ createdAt: -1 })
      .select("type channel success createdAt");

    return res.status(200).json({
      success: true,
      complaintId,
      lastNotifiedAt: complaint.lastNotifiedAt,
      apologySent: complaint.apologySent,
      notifications: history,
    });
  } catch (error) {
    console.error("❌ NOTIFICATION HISTORY ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification history.",
    });
  }
};

