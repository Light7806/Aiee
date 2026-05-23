// Converts a risk score into an allow / challenge / block action.
// Step 5: challenge-level requests now return HTTP 403 unless the caller
// presents a valid challenge token.

// ---------------------------------------------------------------------------
// TEMPORARY PROTOTYPE / TESTING SUPPORT — Step 5 only
// ---------------------------------------------------------------------------
// A real challenge system would issue a signed, one-time token (CAPTCHA,
// proof-of-work, etc.) and verify it cryptographically on the next request.
//
// For now we use a fixed header value so integration tests and manual curl
// calls can exercise the "challenge passed" path without a real token service.
//
// This constant MUST be replaced with proper token generation/verification
// before any production or staging deployment.
// ---------------------------------------------------------------------------
const PROTOTYPE_CHALLENGE_TOKEN = "prototype-pass";

/**
 * Mitigation middleware.
 *
 * Reads req.aieeRisk (set by detectorMiddleware) and enforces the decision:
 *
 *  - "block"     → HTTP 429 JSON response; request does not proceed.
 *                  Challenge tokens do NOT bypass block.
 *
 *  - "challenge" → Check x-aiee-challenge-token header.
 *                  If token matches PROTOTYPE_CHALLENGE_TOKEN:
 *                    set X-Aiee-Challenge-Passed: true and call next().
 *                  Otherwise:
 *                    set X-Aiee-Challenge-Pending: true and return HTTP 403
 *                    with a challenge JSON response including instructions.
 *
 *  - "allow"     → passes through normally.
 *  - missing     → passes through (no detection was run upstream).
 *
 * @type {import('express').RequestHandler}
 */
export function mitigateMiddleware(req, res, next) {
  const risk = req.aieeRisk;

  // No risk assessment attached — nothing to mitigate.
  if (!risk) {
    return next();
  }

  const { decision, score, signals } = risk;

  // --- block: always hard-stop regardless of any challenge token ---
  if (decision === "block") {
    return res.status(429).json({
      error: "Request blocked by Aiee",
      decision: "block",
      score,
      signals
    });
  }

  // --- challenge: verify prototype token or issue a challenge response ---
  if (decision === "challenge") {
    const token = req.get("x-aiee-challenge-token");

    if (token === PROTOTYPE_CHALLENGE_TOKEN) {
      // Token accepted — allow the request through and flag it as passed.
      res.setHeader("X-Aiee-Challenge-Passed", "true");
      return next();
    }

    // No valid token — issue a challenge and stop the request.
    res.setHeader("X-Aiee-Challenge-Pending", "true");
    return res.status(403).json({
      error: "Challenge required by Aiee",
      decision: "challenge",
      score,
      challenge: {
        // ---------------------------------------------------------------------------
        // TEMPORARY PROTOTYPE / TESTING SUPPORT — Step 5 only
        // ---------------------------------------------------------------------------
        // In production this would be a signed challenge nonce or CAPTCHA URL.
        // Replace this block when a real challenge service is wired in Step 6+.
        // ---------------------------------------------------------------------------
        type: "prototype-header",
        instructions: "Retry the request with x-aiee-challenge-token: prototype-pass"
      },
      signals
    });
  }

  // --- allow (or any unexpected value): proceed normally ---
  return next();
}
