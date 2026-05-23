// Detects unusually high request volume from the same IP/session.

import { signalWeights } from "../config/thresholds.js";

/**
 * Detects high request rate.
 * @param {Object} context
 * @param {number} context.requestCountInWindow - Number of requests in the current window
 * @param {number} context.limit - The request limit for the window
 * @returns {Object} Detector result
 */
export function detectRequestRate(context) {
  const { requestCountInWindow, limit } = context;

  const triggered = requestCountInWindow > limit;

  return {
    key: "highRequestRate",
    triggered,
    score: triggered ? signalWeights.highRequestRate : 0,
    reason: triggered
      ? `${requestCountInWindow} requests exceed limit of ${limit}`
      : "Request rate within limit",
    meta: {
      requestCountInWindow,
      limit
    }
  };
}
