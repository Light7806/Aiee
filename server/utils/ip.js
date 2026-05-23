// IP extraction helpers.
// For the local prototype, x-forwarded-for is trusted so individual tests can
// set unique per-test IPs without real routing infrastructure.
//
// IMPORTANT: In production, x-forwarded-for MUST only be trusted when the
// request arrives from a verified reverse-proxy. Without trusted-proxy
// configuration an attacker can spoof any IP by forging this header.
// Use Express's "trust proxy" setting and restrict trusted CIDR ranges.

/**
 * Extracts the effective client IP from the request.
 *
 * Priority:
 *  1. First IP in x-forwarded-for (prototype: useful for test isolation)
 *  2. req.ip (set by Express when trust proxy is configured)
 *  3. req.socket.remoteAddress
 *  4. "unknown"
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  // x-forwarded-for may contain a comma-separated list; use the first entry.
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}
