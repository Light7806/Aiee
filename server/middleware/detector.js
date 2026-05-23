// Runs all signal detectors and attaches risk information to the request.
// Step 6: requestRate, urlPattern, and timingVariance are now wired using
// the in-memory sessionStore for per-client request history.

import { detectUserAgent } from "../detectors/userAgent.js";
import { detectJsBeacon } from "../detectors/jsBeacon.js";
import { detectInteraction } from "../detectors/interaction.js";
import { detectCrawlerWhitelist } from "../detectors/crawlerWhitelist.js";
import { detectRequestRate } from "../detectors/requestRate.js";
import { detectUrlPattern } from "../detectors/urlPattern.js";
import { detectTimingVariance } from "../detectors/timingVariance.js";
import { calculateRisk } from "../services/riskScoring.js";
import { getClientIp } from "../utils/ip.js";
import {
  recordRequest,
  getRequestCountInWindow,
  getRecentPaths,
  getIntervalsMs
} from "../services/sessionStore.js";

// ---------------------------------------------------------------------------
// Detector constants
// ---------------------------------------------------------------------------

/** Time window for request-rate counting (1 minute). */
const REQUEST_RATE_WINDOW_MS = 60_000;

/** Maximum allowed requests per window before highRequestRate triggers. */
const REQUEST_RATE_LIMIT = 10;

/** Number of recent paths to include in URL-pattern analysis. */
const RECENT_PATH_LIMIT = 5;

/** Number of recent events to use for timing-interval computation. */
const TIMING_INTERVAL_LIMIT = 5;

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

/**
 * Derives the single-request context fields from req.
 * Does not touch the session store — pure header extraction.
 *
 * @param {import('express').Request} req
 * @returns {{ userAgent: string, hasValidJsBeacon: boolean, hasInteraction: boolean, ip: string }}
 */
function buildRequestContext(req) {
  return {
    userAgent: req.get("user-agent") || "",
    hasValidJsBeacon: req.get("x-aiee-js-beacon") === "valid",
    hasInteraction: req.get("x-aiee-interaction") === "true",
    ip: getClientIp(req)
  };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Detector middleware.
 *
 * Pipeline for every protected request:
 *  1. Extract single-request context (UA, beacon, interaction, IP).
 *  2. Record the current request in the session store so it is included
 *     in the rate/pattern/timing calculations below.
 *  3. Derive history-based context from the store.
 *  4. Run all 7 detectors.
 *  5. (Optional) Inject synthetic forced-bot signal for testing.
 *  6. Calculate risk via calculateRisk().
 *  7. Attach req.aieeRisk.
 *  8. Set X-Aiee-Decision and X-Aiee-Score headers.
 *  9. Call next() — allow/challenge/block decisions are in mitigateMiddleware.
 *
 * @type {import('express').RequestHandler}
 */
export function detectorMiddleware(req, res, next) {
  const context = buildRequestContext(req);
  const { ip } = context;

  // Record BEFORE reading history so the current request counts toward
  // rate, path, and timing calculations.
  const path = req.path || req.originalUrl || "/";
  const nowMs = Date.now();
  recordRequest(ip, path, nowMs);

  // Derive history-based values from the session store.
  const requestCountInWindow = getRequestCountInWindow(ip, REQUEST_RATE_WINDOW_MS, nowMs);
  const recentPaths = getRecentPaths(ip, RECENT_PATH_LIMIT);
  const intervalsMs = getIntervalsMs(ip, TIMING_INTERVAL_LIMIT);

  // Run all detectors — single-request first, history-based after.
  const detectorResults = [
    // Single-request signals
    detectUserAgent(context),
    detectJsBeacon(context),
    detectInteraction(context),
    detectCrawlerWhitelist(context),

    // History-based signals (safe when history is empty — detectors return score 0)
    detectRequestRate({ requestCountInWindow, limit: REQUEST_RATE_LIMIT }),
    detectUrlPattern({ recentPaths }),
    detectTimingVariance({ intervalsMs })
  ];

  // ---------------------------------------------------------------------------
  // TEMPORARY PROTOTYPE / TESTING SUPPORT — Steps 4–6
  // ---------------------------------------------------------------------------
  // The x-aiee-force-bot header injects a synthetic high-score signal so we can
  // exercise the block path without needing a realistic burst or session history.
  //
  // This signal is NOT in signalWeights and MUST be removed once real production
  // traffic patterns generate sufficiently high scores on their own.
  // ---------------------------------------------------------------------------
  if (req.get("x-aiee-force-bot") === "true") {
    detectorResults.push({
      key: "forcedBotForTesting",
      triggered: true,
      score: 100,
      reason: "Forced bot flag used for middleware testing"
    });
  }
  // ---------------------------------------------------------------------------
  // END TEMPORARY TESTING SUPPORT
  // ---------------------------------------------------------------------------

  const risk = calculateRisk(detectorResults);

  req.aieeRisk = risk;

  res.setHeader("X-Aiee-Decision", risk.decision);
  res.setHeader("X-Aiee-Score", String(risk.score));

  next();
}
