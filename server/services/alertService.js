import Alert from "../models/Alert.js";
import { identifyHotspots } from "./hotspotService.js";
import { detectSpikes } from "./spikeDetectionService.js";

// ==================================================
// ALERT GENERATION CONSTANTS
// ==================================================
const DUPLICATE_PREVENTION_DAYS = 30;

// Alert type constants
const ALERT_TYPE_HOTSPOT = "HOTSPOT_ALERT";
const ALERT_TYPE_SPIKE = "SPIKE_ALERT";

// Severity thresholds for alert generation
const HOTSPOT_ALERT_SEVERITY = "High";
const SPIKE_ALERT_SEVERITY = "Severe";

/**
 * Checks if a duplicate alert exists for the same ward, category, and alertType
 * within the duplicate prevention window (30 days).
 * 
 * This prevents creating multiple alerts for the same issue within a short timeframe,
 * ensuring alert quality and reducing noise for municipal authorities.
 * 
 * @param {String} ward - Ward identifier
 * @param {String} category - Category identifier
 * @param {String} alertType - Type of alert (HOTSPOT_ALERT or SPIKE_ALERT)
 * @returns {Promise<Boolean>} True if duplicate exists, false otherwise
 */
const isDuplicateAlert = async (ward, category, alertType) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DUPLICATE_PREVENTION_DAYS);

    const existingAlert = await Alert.findOne({
      ward,
      category,
      alertType,
      createdAt: { $gte: cutoffDate },
    });

    return !!existingAlert;
  } catch (error) {
    console.error("Error checking for duplicate alert:", error);
    // Conservative approach: assume duplicate exists to prevent creation
    return true;
  }
};

/**
 * Generates a human-readable description for hotspot alerts.
 * 
 * Descriptions must be clear, explainable, and suitable for
 * municipal authority review without technical jargon.
 * 
 * @param {Object} hotspot - Hotspot object with ward, category, severity
 * @returns {String} Human-readable description
 */
const generateHotspotDescription = (hotspot) => {
  return `High ${hotspot.category.toLowerCase()} complaint concentration detected in ${hotspot.ward} over the last 30 days.`;
};

/**
 * Generates a human-readable description for spike alerts.
 * 
 * Descriptions must be clear, explainable, and suitable for
 * municipal authority review without technical jargon.
 * 
 * @param {Object} spike - Spike object with ward, category, severity
 * @returns {String} Human-readable description
 */
const generateSpikeDescription = (spike) => {
  const categoryName = spike.category.toLowerCase();
  return `Severe spike in ${categoryName}-related complaints detected in ${spike.ward} compared to historical baseline.`;
};

/**
 * Creates alerts from hotspot detections.
 * 
 * Only creates alerts for hotspots with severity "High".
 * Prevents duplicate alerts within the 30-day window.
 * 
 * This function consumes the existing hotspot service output
 * and does NOT recompute hotspot logic.
 * 
 * @returns {Promise<Array>} Array of created alert objects
 */
const createHotspotAlerts = async () => {
  try {
    const hotspots = await identifyHotspots();
    const createdAlerts = [];

    for (const hotspot of hotspots) {
      // Only create alert for High severity hotspots
      if (hotspot.severity !== HOTSPOT_ALERT_SEVERITY) {
        continue;
      }

      // Check for duplicate alert
      const isDuplicate = await isDuplicateAlert(
        hotspot.ward,
        hotspot.category,
        ALERT_TYPE_HOTSPOT
      );

      if (isDuplicate) {
        continue;
      }

      // Create alert
      const alert = await Alert.create({
        alertType: ALERT_TYPE_HOTSPOT,
        ward: hotspot.ward,
        category: hotspot.category,
        severity: hotspot.severity,
        referenceScore: hotspot.hotspotScore,
        description: generateHotspotDescription(hotspot),
        status: "Open",
      });

      createdAlerts.push(alert);
    }

    return createdAlerts;
  } catch (error) {
    console.error("Error creating hotspot alerts:", error);
    throw new Error("Failed to create hotspot alerts");
  }
};

/**
 * Creates alerts from spike detections.
 * 
 * Only creates alerts for spikes with severity "Severe".
 * Prevents duplicate alerts within the 30-day window.
 * 
 * This function consumes the existing spike detection service output
 * and does NOT recompute spike logic.
 * 
 * @returns {Promise<Array>} Array of created alert objects
 */
const createSpikeAlerts = async () => {
  try {
    const spikes = await detectSpikes();
    const createdAlerts = [];

    for (const spike of spikes) {
      // Only create alert for Severe spikes
      if (spike.severity !== SPIKE_ALERT_SEVERITY) {
        continue;
      }

      // Check for duplicate alert
      const isDuplicate = await isDuplicateAlert(
        spike.ward,
        spike.category,
        ALERT_TYPE_SPIKE
      );

      if (isDuplicate) {
        continue;
      }

      // Create alert
      const alert = await Alert.create({
        alertType: ALERT_TYPE_SPIKE,
        ward: spike.ward,
        category: spike.category,
        severity: spike.severity,
        referenceScore: spike.spikeRatio,
        description: generateSpikeDescription(spike),
        status: "Open",
      });

      createdAlerts.push(alert);
    }

    return createdAlerts;
  } catch (error) {
    console.error("Error creating spike alerts:", error);
    throw new Error("Failed to create spike alerts");
  }
};

/**
 * Generates all governance alerts by checking hotspots and spikes.
 * 
 * This is the main entry point for alert generation.
 * It processes both hotspot and spike detections and creates
 * appropriate alerts based on severity thresholds.
 * 
 * This function is deterministic and suitable for scheduled execution
 * or manual trigger by municipal authorities.
 * 
 * @returns {Promise<Object>} Object containing created alerts summary
 */
export const generateAlerts = async () => {
  try {
    const hotspotAlerts = await createHotspotAlerts();
    const spikeAlerts = await createSpikeAlerts();

    return {
      hotspotAlertsCreated: hotspotAlerts.length,
      spikeAlertsCreated: spikeAlerts.length,
      totalAlertsCreated: hotspotAlerts.length + spikeAlerts.length,
      alerts: [...hotspotAlerts, ...spikeAlerts],
    };
  } catch (error) {
    console.error("Error generating alerts:", error);
    throw new Error("Failed to generate alerts");
  }
};
