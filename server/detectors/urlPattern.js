// Detects sequential or repetitive access patterns such as /data/1, /data/2, /data/3.

import { signalWeights } from "../config/thresholds.js";

/**
 * Extracts the route prefix (everything except the final segment) from a URL path.
 * @param {string} path - The URL path
 * @returns {string} The route prefix (e.g., "/api/compensation" from "/api/compensation/123")
 */
function extractRoutePrefix(path) {
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return path; // No prefix if only one segment
  return "/" + segments.slice(0, -1).join("/"); // Return prefix without trailing slash
}

/**
 * Extracts numeric IDs from a URL path.
 * Returns null if it looks like a UUID or has no numeric pattern.
 */
function extractNumericId(path) {
  // Extract the last segment
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const lastSegment = segments[segments.length - 1];

  // Check if it's a UUID (pattern: 8-4-4-4-12 hex digits with dashes)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(lastSegment)) {
    return null;
  }

  // Extract pure numeric part
  const numMatch = lastSegment.match(/^\d+$/);
  return numMatch ? parseInt(numMatch[0], 10) : null;
}

/**
 * Detects sequential URL patterns.
 * Only triggers when paths represent consecutive numeric IDs within the same route family.
 * @param {Object} context
 * @param {string[]} context.recentPaths - Recent URL paths accessed
 * @returns {Object} Detector result
 */
export function detectUrlPattern(context) {
  const { recentPaths = [] } = context;

  // Need at least 3 paths to form a sequence
  if (!recentPaths || recentPaths.length < 3) {
    return {
      key: "sequentialUrlPattern",
      triggered: false,
      score: 0,
      reason: "Insufficient paths to determine sequential pattern",
      meta: {
        pathCount: recentPaths ? recentPaths.length : 0
      }
    };
  }

  // Extract route prefixes and numeric IDs for each path
  const pathData = recentPaths.map((path) => ({
    path,
    prefix: extractRoutePrefix(path),
    id: extractNumericId(path)
  }));

  // Check if all extracted IDs are valid numbers (no UUIDs, no non-numeric segments)
  const allHaveValidIds = pathData.every((d) => d.id !== null && !isNaN(d.id));
  if (!allHaveValidIds) {
    return {
      key: "sequentialUrlPattern",
      triggered: false,
      score: 0,
      reason: "Paths do not contain numeric patterns or contain UUIDs",
      meta: {
        recentPaths,
        extractedIds: pathData.map((d) => d.id)
      }
    };
  }

  // Check if all paths have the same route prefix
  const firstPrefix = pathData[0].prefix;
  const allSamePrefix = pathData.every((d) => d.prefix === firstPrefix);
  if (!allSamePrefix) {
    return {
      key: "sequentialUrlPattern",
      triggered: false,
      score: 0,
      reason: "Paths have different route prefixes",
      meta: {
        recentPaths,
        extractedIds: pathData.map((d) => d.id),
        prefixes: pathData.map((d) => d.prefix)
      }
    };
  }

  // Check if IDs form a consecutive increasing sequence (each ID = previous ID + 1)
  let isConsecutive = true;
  for (let i = 1; i < pathData.length; i++) {
    if (pathData[i].id !== pathData[i - 1].id + 1) {
      isConsecutive = false;
      break;
    }
  }

  const triggered = isConsecutive;

  return {
    key: "sequentialUrlPattern",
    triggered,
    score: triggered ? signalWeights.sequentialUrlPattern : 0,
    reason: triggered
      ? `Sequential numeric pattern detected in paths: ${pathData.map((d) => d.id).join(", ")}`
      : "No consecutive sequential numeric pattern detected",
    meta: {
      recentPaths,
      extractedIds: pathData.map((d) => d.id),
      prefixes: pathData.map((d) => d.prefix),
      isConsecutive
    }
  };
}
