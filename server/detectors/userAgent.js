// Detects missing, scripted, or headless browser User-Agent values.

import { signalWeights } from "../config/thresholds.js";

const suspiciousPatterns = [
  "python-requests",
  "curl",
  "wget",
  "axios",
  "node-fetch",
  "HeadlessChrome",
  "Playwright",
  "Puppeteer"
];

/**
 * Detects suspicious user agents.
 * @param {Object} context
 * @param {string} context.userAgent - The User-Agent header value
 * @returns {Object} Detector result
 */
export function detectUserAgent(context) {
  const { userAgent } = context;

  // Missing or empty user agent is suspicious
  if (!userAgent || userAgent.trim() === "") {
    return {
      key: "suspiciousUserAgent",
      triggered: true,
      score: signalWeights.suspiciousUserAgent,
      reason: "User-Agent header is missing or empty",
      meta: {
        userAgent: userAgent || "(empty)"
      }
    };
  }

  const lowerUA = userAgent.toLowerCase();

  // Check for known suspicious patterns
  const matchedPattern = suspiciousPatterns.find((pattern) =>
    lowerUA.includes(pattern.toLowerCase())
  );

  const triggered = !!matchedPattern;

  return {
    key: "suspiciousUserAgent",
    triggered,
    score: triggered ? signalWeights.suspiciousUserAgent : 0,
    reason: triggered
      ? `Suspicious User-Agent pattern detected: "${matchedPattern}"`
      : "User-Agent appears normal",
    meta: {
      userAgent,
      matchedPattern: matchedPattern || null
    }
  };
}
