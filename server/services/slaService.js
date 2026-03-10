/**
 * SLA Service (Read-only, Advisory)
 *
 * GOVERNANCE NOTES:
 * - SLA indicators are advisory only.
 * - No automatic status changes or escalations are performed.
 * - Final decisions rest with authorized municipal officials.
 */

const PRIORITY_SLA_HOURS = {
  High: 24,
  Medium: 72,
  Low: 120,
};

/**
 * Get SLA duration in hours for a given priority.
 * Defaults to Medium priority if value is missing or invalid.
 *
 * @param {string} priority
 * @returns {number}
 */
export const getSlaHoursForPriority = (priority) => {
  if (priority && Object.prototype.hasOwnProperty.call(PRIORITY_SLA_HOURS, priority)) {
    return PRIORITY_SLA_HOURS[priority];
  }
  // Safe default
  return PRIORITY_SLA_HOURS.Medium;
};

/**
 * Compute SLA advisory fields for a single complaint.
 * This function is PURE and does not mutate the database.
 *
 * @param {Object} complaint - Mongoose document or plain object with createdAt and priority
 * @param {Date} [now] - Optional injection for testing; defaults to current server time
 * @returns {{ slaDeadline: string, slaRemainingHours: number, slaStatus: string }}
 */
export const computeSlaForComplaint = (complaint, now = new Date()) => {
  if (!complaint) {
    return {
      slaDeadline: null,
      slaRemainingHours: null,
      slaStatus: "On Track",
    };
  }

  // Resolved complaints: display as Closed; do not compute breach.
  if (complaint.status === "Resolved") {
    return {
      slaDeadline: null,
      slaRemainingHours: null,
      slaStatus: "Closed",
    };
  }

  const authoritativePriority =
    complaint.finalPriority || complaint.priority || "Medium";
  const slaHours = getSlaHoursForPriority(authoritativePriority);

  const createdAt = complaint.createdAt ? new Date(complaint.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return {
      slaDeadline: null,
      slaRemainingHours: null,
      slaStatus: "On Track",
    };
  }

  const deadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);

  const nowTime = now instanceof Date ? now : new Date(now);
  const diffMs = deadline.getTime() - nowTime.getTime();
  const remainingHoursRaw = diffMs / (60 * 60 * 1000);
  const remainingHours = Number.isFinite(remainingHoursRaw)
    ? Math.max(0, Number(remainingHoursRaw.toFixed(2)))
    : null;

  let slaStatus = "On Track";
  if (remainingHours === null) {
    slaStatus = "On Track";
  } else if (remainingHours <= 0) {
    slaStatus = "Breached";
  } else {
    const thresholdHours = slaHours * 0.25;
    if (remainingHours <= thresholdHours) {
      slaStatus = "Approaching Breach";
    }
  }

  return {
    slaDeadline: deadline.toISOString(),
    slaRemainingHours: remainingHours,
    slaStatus,
  };
};

/**
 * Compute SLA summary buckets for a collection of complaints.
 * Only uses in-memory data; does not alter database state.
 *
 * @param {Array<Object>} complaints
 * @returns {{
 *   totalMonitored: number,
 *   onTrackCount: number,
 *   approachingBreachCount: number,
 *   breachedCount: number
 * }}
 */
export const computeSlaSummary = (complaints = []) => {
  let onTrackCount = 0;
  let approachingBreachCount = 0;
  let breachedCount = 0;

  complaints.forEach((complaint) => {
    const { slaStatus } = computeSlaForComplaint(complaint);
    if (slaStatus === "Breached") {
      breachedCount += 1;
    } else if (slaStatus === "Approaching Breach") {
      approachingBreachCount += 1;
    } else if (slaStatus === "Closed") {
      // Resolved complaints; not counted in active SLA monitoring
      onTrackCount += 1;
    } else {
      onTrackCount += 1;
    }
  });

  return {
    totalMonitored: complaints.length,
    onTrackCount,
    approachingBreachCount,
    breachedCount,
  };
};

