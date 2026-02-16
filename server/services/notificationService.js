import nodemailer from "nodemailer";

/**
 * Notification Service (Email-only) — Production-ready for Gmail SMTP
 *
 * GOVERNANCE NOTES:
 * - Emails are informational only; no complaint status changes or escalations.
 * - All SMTP config from env. Transporter centralized here.
 * - Gmail: port 587, STARTTLS. Full SMTP errors logged for debugging.
 */

// Required env (read at runtime so dotenv has run in server.js)
const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
});

let transporterInstance = null;

/**
 * Create nodemailer transporter (singleton).
 * Gmail: port 587, secure: false, requireTLS: true.
 * Centralized so all sends use the same config.
 */
export const getTransporter = () => {
  if (transporterInstance) return transporterInstance;

  const { host, port, user, pass, from } = getSmtpConfig();

  if (!host || !port || !user || !pass) {
    return null;
  }

  try {
    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure: false,
      requireTLS: true,
      auth: {
        user,
        pass,
      },
    });
    return transporterInstance;
  } catch (error) {
    console.error("[NotificationService] Failed to create transporter:", {
      code: error.code,
      message: error.message,
    });
    transporterInstance = null;
    return null;
  }
};

/**
 * Verify SMTP connection at startup.
 * Logs success or full failure details (never logs password).
 */
export const verifyTransporter = async () => {
  const tx = getTransporter();
  if (!tx) {
    console.error("[NotificationService] SMTP verify skipped: transporter not created (missing config).");
    return false;
  }
  try {
    await tx.verify();
    console.log("[NotificationService] SMTP connection verified successfully.");
    return true;
  } catch (error) {
    console.error("[NotificationService] SMTP verify failed:", {
      code: error.code,
      response: error.response,
      message: error.message,
    });
    return false;
  }
};

/**
 * Check if required SMTP env vars are present (for startup validation).
 * Returns { ok: boolean, missing: string[] }. Never reads or logs SMTP_PASS value.
 */
export const validateSmtpEnv = () => {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
  const missing = required.filter((key) => {
    const val = process.env[key];
    return val === undefined || val === null || String(val).trim() === "";
  });
  return { ok: missing.length === 0, missing };
};

const NOTIFICATION_TYPES = {
  ACKNOWLEDGEMENT: "ACKNOWLEDGEMENT",
  STATUS_UPDATE: "STATUS_UPDATE",
  SLA_DELAY: "SLA_DELAY",
  RESOLUTION: "RESOLUTION",
};

/**
 * Send one email. All sendMail calls are wrapped here with try/catch and full error logging.
 * Returns { success: true } or { success: false, error: string } (exact SMTP error for API).
 */
export const sendEmail = async ({ to, subject, text }) => {
  const tx = getTransporter();
  if (!tx) {
    const msg = "Transporter unavailable (SMTP not configured).";
    console.warn("[NotificationService]", msg);
    return { success: false, error: msg };
  }

  const from = getSmtpConfig().from;
  try {
    await tx.sendMail({
      from,
      to,
      subject,
      text,
    });
    console.log("[NotificationService] Email sent successfully to", to);
    return { success: true };
  } catch (error) {
    const errDetail = {
      code: error.code,
      response: error.response,
      message: error.message,
    };
    console.error("[NotificationService] sendMail failed:", errDetail);
    const errorString = [error.code, error.response, error.message].filter(Boolean).join(" | ") || error.message;
    return { success: false, error: errorString };
  }
};

/**
 * Rate limiting helper (per-complaint). Prevents duplicate emails.
 */
export const isWithinNotificationRateLimit = (complaint, minMinutes = 15) => {
  if (!complaint || !complaint.lastNotifiedAt) return true;
  const last = new Date(complaint.lastNotifiedAt);
  if (Number.isNaN(last.getTime())) return true;
  const diffMinutes = (Date.now() - last.getTime()) / (60 * 1000);
  return diffMinutes >= minMinutes;
};

const NOTIFICATION_DISCLAIMER =
  "Notifications are informational and do not indicate complaint resolution. They do not replace official actions by authorities.";

export const buildAcknowledgementEmail = (complaint, user) => {
  const subject = "Acknowledgement of your municipal grievance";
  const textLines = [
    `Dear ${user?.name || "Citizen"},`,
    "",
    "This is to acknowledge that we have received your municipal grievance.",
    "",
    `Title: ${complaint.title || "Municipal grievance"}`,
    `Category: ${complaint.category || "Not specified"}`,
    `Location: ${complaint.location || "Not specified"}`,
    "",
    "Our team will review your grievance in line with municipal procedures.",
    "",
    NOTIFICATION_DISCLAIMER,
    "",
    "Regards,",
    "Municipal Grievance Cell",
  ];
  return { subject, text: textLines.join("\n") };
};

export const buildStatusUpdateEmail = (complaint, user, previousStatus) => {
  const subject = "Update on your municipal grievance";
  const textLines = [
    `Dear ${user?.name || "Citizen"},`,
    "",
    "This is an update on the status of your municipal grievance.",
    "",
    `Title: ${complaint.title || "Municipal grievance"}`,
    `Reference ID: ${complaint._id?.toString() || "Not available"}`,
    previousStatus ? `Previous status: ${previousStatus}` : undefined,
    `Current status: ${complaint.status || "Not available"}`,
    "",
    "This message is shared to keep you informed about the progress made so far.",
    "",
    NOTIFICATION_DISCLAIMER,
    "",
    "Regards,",
    "Municipal Grievance Cell",
  ].filter(Boolean);
  return { subject, text: textLines.join("\n") };
};

export const buildSlaDelayApologyEmail = (complaint, user) => {
  const subject = "Update on your municipal grievance (SLA delay)";
  const textLines = [
    `Dear ${user?.name || "Citizen"},`,
    "",
    "We are writing to inform you that there has been a delay in addressing your municipal grievance.",
    "",
    "We regret the delay in addressing your grievance and appreciate your patience.",
    "",
    "Our teams are continuing to work on municipal issues based on available capacity and standard procedures.",
    "",
    NOTIFICATION_DISCLAIMER,
    "",
    "Regards,",
    "Municipal Grievance Cell",
  ];
  return { subject, text: textLines.join("\n") };
};

export const buildResolutionConfirmationEmail = (complaint, user) => {
  const subject = "Information regarding your municipal grievance";
  const textLines = [
    `Dear ${user?.name || "Citizen"},`,
    "",
    "This is to inform you that, as per system records, your municipal grievance has been marked as resolved by the municipal team.",
    "",
    `Title: ${complaint.title || "Municipal grievance"}`,
    `Reference ID: ${complaint._id?.toString() || "Not available"}`,
    "",
    "If you have any further concerns, you may contact the municipal office through the usual channels.",
    "",
    NOTIFICATION_DISCLAIMER,
    "",
    "Regards,",
    "Municipal Grievance Cell",
  ];
  return { subject, text: textLines.join("\n") };
};

export { NOTIFICATION_TYPES, NOTIFICATION_DISCLAIMER };
