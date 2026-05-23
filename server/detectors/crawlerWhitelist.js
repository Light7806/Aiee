// Applies negative score for known legitimate crawlers.

import { signalWeights } from "../config/thresholds.js";
import { crawlerWhitelist } from "../config/crawlerWhitelist.js";

/**
 * Detects known search crawler user agents.
 * @param {Object} context
 * @param {string} context.userAgent - The User-Agent header value
 * @returns {Object} Detector result
 */
export function detectCrawlerWhitelist(context) {
  const { userAgent } = context;

  if (!userAgent || userAgent.trim() === "") {
    return {
      key: "knownSearchCrawler",
      triggered: false,
      score: 0,
      reason: "User-Agent header is missing or empty",
      meta: {
        userAgent: userAgent || "(empty)"
      }
    };
  }

  const lowerUA = userAgent.toLowerCase();

  // Check if user agent contains any known crawler name
  const matchedCrawler = crawlerWhitelist.find((crawler) =>
    lowerUA.includes(crawler.toLowerCase())
  );

  const triggered = !!matchedCrawler;

  return {
    key: "knownSearchCrawler",
    triggered,
    score: triggered ? signalWeights.knownSearchCrawler : 0,
    reason: triggered
      ? `Known search crawler detected: "${matchedCrawler}"`
      : "Not a known search crawler",
    meta: {
      userAgent,
      matchedCrawler: matchedCrawler || null
    }
  };
}
