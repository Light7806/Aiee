// Combines detector outputs into one score and decision.

import { scoreTiers } from "../config/thresholds.js";

/**
 * Normalizes a raw score to the 0-100 range.
 * @param {number} score - The raw score, can be negative or over 100
 * @returns {number} The normalized score clamped to [0, 100]
 */
export function normalizeScore(score) {
  return Math.max(0, Math.min(100, score));
}

/**
 * Gets the decision category for a normalized score.
 * @param {number} score - The normalized score (0-100)
 * @returns {string} "allow", "challenge", or "block"
 */
export function getDecision(score) {
  if (score >= scoreTiers.blockMin) return "block";
  if (score <= scoreTiers.allowMax) return "allow";
  return "challenge";
}

/**
 * Calculates the overall risk score and decision from detector results.
 * @param {Array} detectorResults - Array of detector result objects
 * @returns {Object} Risk assessment with score, decision, and signals
 */
export function calculateRisk(detectorResults) {
  // Calculate raw score from all detector signals
  const rawScore = detectorResults.reduce((total, result) => total + result.score, 0);

  // Normalize the score to [0, 100]
  const normalizedScore = normalizeScore(rawScore);

  // Get decision based on normalized score
  const decision = getDecision(normalizedScore);

  return {
    score: normalizedScore,
    decision,
    signals: detectorResults
  };
}
