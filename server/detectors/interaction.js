// Detects whether the browser session has reported mouse or touch activity.

import { signalWeights } from "../config/thresholds.js";

/**
 * Detects missing user interaction.
 * @param {Object} context
 * @param {boolean} context.hasInteraction - Whether user interaction was detected
 * @returns {Object} Detector result
 */
export function detectInteraction(context) {
  const { hasInteraction } = context;

  const triggered = !hasInteraction;

  return {
    key: "missingInteraction",
    triggered,
    score: triggered ? signalWeights.missingInteraction : 0,
    reason: triggered
      ? "No mouse or touch interaction detected"
      : "User interaction detected",
    meta: {
      hasInteraction
    }
  };
}
