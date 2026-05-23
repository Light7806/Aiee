// Detects machine-regular request intervals.

import { signalWeights } from "../config/thresholds.js";

/**
 * Calculates standard deviation of an array of numbers.
 */
function standardDeviation(values) {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance =
    squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Detects machine-regular request timing.
 * @param {Object} context
 * @param {number[]} context.intervalsMs - Request intervals in milliseconds
 * @param {number} context.minVarianceMs - Minimum variance threshold (default 50)
 * @returns {Object} Detector result
 */
export function detectTimingVariance(context) {
  const { intervalsMs = [], minVarianceMs = 50 } = context;

  // Need at least 3 intervals to determine a pattern
  if (!intervalsMs || intervalsMs.length < 3) {
    return {
      key: "machineRegularTiming",
      triggered: false,
      score: 0,
      reason: "Insufficient intervals to determine timing pattern",
      meta: {
        intervalCount: intervalsMs ? intervalsMs.length : 0
      }
    };
  }

  // Calculate standard deviation
  const stdDev = standardDeviation(intervalsMs);

  // If standard deviation is too low, timing is too regular (machine-like)
  const triggered = stdDev < minVarianceMs;

  return {
    key: "machineRegularTiming",
    triggered,
    score: triggered ? signalWeights.machineRegularTiming : 0,
    reason: triggered
      ? `Request timing too regular (std dev: ${stdDev.toFixed(2)}ms, threshold: ${minVarianceMs}ms)`
      : `Request timing variance acceptable (std dev: ${stdDev.toFixed(2)}ms)`,
    meta: {
      intervals: intervalsMs,
      standardDeviation: parseFloat(stdDev.toFixed(2)),
      minVarianceMs,
      triggered
    }
  };
}
