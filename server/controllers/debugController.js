/**
 * Debug controller — temporary test-email endpoint for SMTP verification.
 * Admin-only. Sends one test email to SMTP_USER and returns success or exact SMTP error.
 */

import { sendEmail } from "../services/notificationService.js";

const NOTIFICATION_DISCLAIMER =
  "Notifications are informational and do not indicate complaint resolution. They do not replace official actions by authorities.";

/**
 * GET or POST /api/debug/test-email
 * Sends a test email to process.env.SMTP_USER. Returns success or exact SMTP error.
 */
export const testEmail = async (req, res) => {
  const to = process.env.SMTP_USER;
  if (!to) {
    return res.status(500).json({
      success: false,
      error: "SMTP_USER not set; cannot send test email.",
    });
  }

  const subject = "Municipal Grievance System — Test Email";
  const text = [
    "This is a test email from the Municipal Grievance Redressal System.",
    "",
    NOTIFICATION_DISCLAIMER,
    "",
    "If you received this, SMTP is configured correctly.",
  ].join("\n");

  try {
    const result = await sendEmail({ to, subject, text });
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Test email sent successfully to " + to,
      });
    }
    return res.status(500).json({
      success: false,
      error: result.error || "Failed to send test email.",
    });
  } catch (err) {
    console.error("[DEBUG test-email] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Unexpected error sending test email.",
    });
  }
};
