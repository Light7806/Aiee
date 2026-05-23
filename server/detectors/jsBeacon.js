// Detects whether the client has executed browser JavaScript and set a signed beacon cookie.

import { signalWeights } from "../config/thresholds.js";

/**
 * Detects missing JavaScript beacon.
 * @param {Object} context
 * @param {boolean} context.hasValidJsBeacon - Whether a valid JS beacon was found
 * @returns {Object} Detector result
 */
export function detectJsBeacon(context) {
  const { hasValidJsBeacon } = context;

  const triggered = !hasValidJsBeacon;

  return {
    key: "missingJsBeacon",
    triggered,
    score: triggered ? signalWeights.missingJsBeacon : 0,
    reason: triggered
      ? "No valid JavaScript beacon cookie found"
      : "Valid JavaScript beacon detected",
    meta: {
      hasValidJsBeacon
    }
  };
}
