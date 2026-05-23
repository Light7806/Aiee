// Tests for detector and mitigation middleware — Steps 4, 5 & 6.
// Uses node:test and node:assert only. No external test dependencies.
// Integration tests use Node's built-in http module with createApp().

import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import { detectorMiddleware } from "../server/middleware/detector.js";
import { mitigateMiddleware } from "../server/middleware/mitigate.js";
import { createApp } from "../server/app.js";
import { clearAllSessions } from "../server/services/sessionStore.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal mock Express request object.
 * Only includes what the middleware reads from req.
 *
 * @param {Object} headers   - Header key/value pairs (keys lowercased)
 * @param {Object} params    - Route params (e.g. { uuid: "..." })
 * @param {Object} overrides - Any extra properties to attach directly
 * @returns {Object} Mock req
 */
function mockReq(headers = {}, params = {}, overrides = {}) {
  return {
    get(name) {
      return headers[name.toLowerCase()] ?? undefined;
    },
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
    path: "/api/compensation/test",
    originalUrl: "/api/compensation/test",
    params,
    ...overrides
  };
}

/**
 * Creates a minimal mock Express response object.
 * Captures status, json body, and headers so tests can assert on them.
 *
 * @returns {Object} Mock res with .statusCode, .body, .headers
 */
function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},

    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

/**
 * Wraps a middleware call in a promise so we can await it.
 * Returns { req, res } after the middleware calls next (or terminates the response).
 *
 * @param {Function} middleware
 * @param {Object}   req
 * @param {Object}   res
 * @returns {Promise<{ req: Object, res: Object, called: boolean }>}
 */
function runMiddleware(middleware, req, res) {
  return new Promise((resolve, reject) => {
    try {
      middleware(req, res, () => resolve({ req, res, called: true }));
      // If middleware terminates without calling next, resolve after a tick.
      // (mitigateMiddleware calls res.json and returns without next for "block".)
      if (res.body !== null) {
        resolve({ req, res, called: false });
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Makes a raw HTTP request to a local server and returns a promise that
 * resolves with { statusCode, headers, body } once the response is complete.
 *
 * @param {number} port
 * @param {string} path
 * @param {Object} headers
 * @returns {Promise<{ statusCode: number, headers: Object, body: string }>}
 */
function httpGet(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path, headers },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: raw
          })
        );
      }
    );
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// detectorMiddleware tests
// ---------------------------------------------------------------------------

test("detectorMiddleware", async (t) => {
  // Isolate session state: each subtest uses a unique x-forwarded-for IP so
  // accumulated history from one test cannot affect another.
  // Top-level before/after sweep up anything that slips through.
  t.beforeEach(() => clearAllSessions());
  t.after(() => clearAllSessions());

  // --- core attachment ---

  await t.test("attaches req.aieeRisk with score, decision, and signals", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
      "x-aiee-js-beacon": "valid",
      "x-aiee-interaction": "true",
      "x-forwarded-for": "1.0.0.1"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    assert.ok(req.aieeRisk, "req.aieeRisk should be attached");
    assert.strictEqual(typeof req.aieeRisk.score, "number");
    assert.ok(["allow", "challenge", "block"].includes(req.aieeRisk.decision));
    assert.ok(Array.isArray(req.aieeRisk.signals));
  });

  // --- response headers ---

  await t.test("sets X-Aiee-Decision and X-Aiee-Score response headers", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
      "x-aiee-js-beacon": "valid",
      "x-aiee-interaction": "true",
      "x-forwarded-for": "1.0.0.2"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    assert.ok(
      res.headers["x-aiee-decision"],
      "X-Aiee-Decision header should be set"
    );
    assert.ok(
      res.headers["x-aiee-score"] !== undefined,
      "X-Aiee-Score header should be set"
    );
    assert.ok(
      ["allow", "challenge", "block"].includes(res.headers["x-aiee-decision"]),
      "X-Aiee-Decision should be one of the valid values"
    );
  });

  await t.test("always calls next()", async () => {
    const req = mockReq({
      "user-agent": "python-requests/2.31.0",
      "x-forwarded-for": "1.0.0.3"
    });
    const res = mockRes();
    const { called } = await runMiddleware(detectorMiddleware, req, res);
    assert.strictEqual(called, true, "next() should always be called by detectorMiddleware");
  });

  // --- low-risk human-like request ---

  await t.test("human-like headers produce allow decision (score ≤ 29)", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "x-aiee-js-beacon": "valid",
      "x-aiee-interaction": "true",
      "x-forwarded-for": "1.0.0.4"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    assert.strictEqual(req.aieeRisk.decision, "allow");
    assert.ok(req.aieeRisk.score <= 29, `score should be ≤ 29, got ${req.aieeRisk.score}`);
  });

  // --- individual signal contributions ---

  await t.test("missing JS beacon contributes missingJsBeacon signal with score 15", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      "x-aiee-interaction": "true",
      "x-forwarded-for": "1.0.0.5"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    const beaconSignal = req.aieeRisk.signals.find((s) => s.key === "missingJsBeacon");
    assert.ok(beaconSignal, "missingJsBeacon signal should be present");
    assert.strictEqual(beaconSignal.triggered, true);
    assert.strictEqual(beaconSignal.score, 15);
  });

  await t.test("missing interaction contributes missingInteraction signal with score 10", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      "x-aiee-js-beacon": "valid",
      "x-forwarded-for": "1.0.0.6"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    const interactionSignal = req.aieeRisk.signals.find((s) => s.key === "missingInteraction");
    assert.ok(interactionSignal, "missingInteraction signal should be present");
    assert.strictEqual(interactionSignal.triggered, true);
    assert.strictEqual(interactionSignal.score, 10);
  });

  await t.test("missing JS beacon and missing interaction both increase score", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      "x-forwarded-for": "1.0.0.7"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    assert.ok(
      req.aieeRisk.score >= 25,
      `score should be at least 25 when beacon and interaction are both missing, got ${req.aieeRisk.score}`
    );
  });

  await t.test("suspicious user-agent triggers suspiciousUserAgent signal", async () => {
    const req = mockReq({
      "user-agent": "python-requests/2.31.0",
      "x-forwarded-for": "1.0.0.8"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    const uaSignal = req.aieeRisk.signals.find((s) => s.key === "suspiciousUserAgent");
    assert.ok(uaSignal, "suspiciousUserAgent signal should be present");
    assert.strictEqual(uaSignal.triggered, true);
    assert.strictEqual(uaSignal.score, 20);
  });

  // --- history-based detector signals are present in results (Step 6) ---

  await t.test("signals array includes requestRate, urlPattern, and timingVariance entries", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 Chrome/120",
      "x-aiee-js-beacon": "valid",
      "x-aiee-interaction": "true",
      "x-forwarded-for": "1.0.0.9"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    const keys = req.aieeRisk.signals.map((s) => s.key);
    assert.ok(keys.includes("highRequestRate"), "highRequestRate signal should be present");
    assert.ok(keys.includes("sequentialUrlPattern"), "sequentialUrlPattern signal should be present");
    assert.ok(keys.includes("machineRegularTiming"), "machineRegularTiming signal should be present");
  });

  await t.test("more than 10 requests from same IP triggers highRequestRate", async () => {
    const ip = "1.0.1.1";
    // Pre-load 11 requests for this IP using the store directly so we control
    // timing without waiting. Each mock req increments the counter by 1 more.
    for (let i = 0; i < 11; i++) {
      const req = mockReq({
        "user-agent": "python-requests/2.31.0",
        "x-forwarded-for": ip
      });
      await runMiddleware(detectorMiddleware, req, mockRes());
    }
    // The 12th request should now see requestCountInWindow > 10.
    const req12 = mockReq({
      "user-agent": "python-requests/2.31.0",
      "x-forwarded-for": ip
    });
    const res12 = mockRes();
    await runMiddleware(detectorMiddleware, req12, res12);

    const rateSignal = req12.aieeRisk.signals.find((s) => s.key === "highRequestRate");
    assert.ok(rateSignal, "highRequestRate signal should be present");
    assert.strictEqual(rateSignal.triggered, true, "highRequestRate should trigger after 11+ requests");
    assert.strictEqual(rateSignal.score, 35);
  });

  await t.test("sequential numeric paths from same IP trigger sequentialUrlPattern", async () => {
    const ip = "1.0.1.2";
    const paths = ["/api/compensation/1", "/api/compensation/2", "/api/compensation/3"];
    for (const path of paths) {
      const req = mockReq(
        { "user-agent": "python-requests/2.31.0", "x-forwarded-for": ip },
        {},
        { path, originalUrl: path }
      );
      await runMiddleware(detectorMiddleware, req, mockRes());
    }
    // After 3 sequential requests, check the last result.
    const lastReq = mockReq(
      { "user-agent": "python-requests/2.31.0", "x-forwarded-for": ip },
      {},
      { path: "/api/compensation/3", originalUrl: "/api/compensation/3" }
    );
    // Note: we already ran path /3 above, so just inspect the third run's risk.
    // Re-run to get a fresh req with aieeRisk attached.
    const req3 = mockReq(
      { "user-agent": "python-requests/2.31.0", "x-forwarded-for": ip },
      {},
      { path: "/api/compensation/4", originalUrl: "/api/compensation/4" }
    );
    const res3 = mockRes();
    await runMiddleware(detectorMiddleware, req3, res3);

    const urlSignal = req3.aieeRisk.signals.find((s) => s.key === "sequentialUrlPattern");
    assert.ok(urlSignal, "sequentialUrlPattern signal should be present");
    assert.strictEqual(urlSignal.triggered, true, "sequential numeric paths should trigger detector");
    assert.strictEqual(urlSignal.score, 25);
  });

  await t.test("regular-timing requests from same IP trigger machineRegularTiming", async () => {
    // Seed events at fixed PAST timestamps so that when detectorMiddleware runs
    // and records the current request, the interval between the last seeded event
    // and the real event is predictable regardless of execution speed.
    //
    // Layout: seed at [now-400, now-300, now-200, now-100].
    // Middleware records at ~now. Resulting last-5 intervals: [100, 100, 100, ~100].
    // Std dev ≈ 0 — well below the 50ms threshold → machineRegularTiming triggers.
    const { recordRequest } = await import("../server/services/sessionStore.js");
    const ip = "1.0.1.3";
    const now = Date.now();
    // Seed 4 events ending 100ms before now so the middleware's event completes the pattern.
    for (let i = 0; i < 4; i++) {
      recordRequest(ip, "/api/compensation/test", now - 400 + i * 100);
    }
    // Middleware records a 5th event at real Date.now(), ~100ms after the last seed.
    const req = mockReq({ "user-agent": "python-requests/2.31.0", "x-forwarded-for": ip });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    const timingSignal = req.aieeRisk.signals.find((s) => s.key === "machineRegularTiming");
    assert.ok(timingSignal, "machineRegularTiming signal should be present");
    assert.strictEqual(timingSignal.triggered, true, "regular ~100ms intervals should trigger detector");
    assert.strictEqual(timingSignal.score, 20);
  });

  // --- forced-bot testing support ---

  await t.test("x-aiee-force-bot: true produces block decision", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 Chrome/120",
      "x-aiee-force-bot": "true",
      "x-forwarded-for": "1.0.2.1"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    assert.strictEqual(
      req.aieeRisk.decision,
      "block",
      "force-bot header should push decision to block"
    );
  });

  await t.test("x-aiee-force-bot: true injects forcedBotForTesting signal with score 100", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 Chrome/120",
      "x-aiee-force-bot": "true",
      "x-forwarded-for": "1.0.2.2"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    const forcedSignal = req.aieeRisk.signals.find((s) => s.key === "forcedBotForTesting");
    assert.ok(forcedSignal, "forcedBotForTesting signal should be present");
    assert.strictEqual(forcedSignal.triggered, true);
    assert.strictEqual(forcedSignal.score, 100);
  });

  await t.test("x-aiee-force-bot: false does not inject forced signal", async () => {
    const req = mockReq({
      "user-agent": "Mozilla/5.0 Chrome/120",
      "x-aiee-force-bot": "false",
      "x-forwarded-for": "1.0.2.3"
    });
    const res = mockRes();
    await runMiddleware(detectorMiddleware, req, res);

    const forcedSignal = req.aieeRisk.signals.find((s) => s.key === "forcedBotForTesting");
    assert.strictEqual(forcedSignal, undefined, "forcedBotForTesting should NOT be present when header is 'false'");
  });
});

// ---------------------------------------------------------------------------
// mitigateMiddleware tests
// ---------------------------------------------------------------------------

test("mitigateMiddleware", async (t) => {
  // --- missing risk ---

  await t.test("calls next() when req.aieeRisk is missing", async () => {
    const req = mockReq();
    // No aieeRisk attached — simulates the case where detectorMiddleware was skipped.
    const res = mockRes();
    const { called } = await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(called, true);
    assert.strictEqual(res.body, null, "response should not have been written");
  });

  // --- allow ---

  await t.test("calls next() and does not write response for allow decision", async () => {
    const req = mockReq();
    req.aieeRisk = { decision: "allow", score: 0, signals: [] };
    const res = mockRes();
    const { called } = await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(called, true);
    assert.strictEqual(res.body, null);
  });

  // --- challenge without token (Step 5: must return 403) ---

  await t.test("challenge without token returns HTTP 403", async () => {
    const req = mockReq(); // no x-aiee-challenge-token header
    req.aieeRisk = { decision: "challenge", score: 45, signals: [] };
    const res = mockRes();
    await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(res.statusCode, 403, "challenge without token should be 403");
  });

  await t.test("challenge without token does not call next()", async () => {
    const req = mockReq();
    req.aieeRisk = { decision: "challenge", score: 45, signals: [] };
    const res = mockRes();
    const { called } = await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(called, false, "next() must NOT be called when challenge token is absent");
  });

  await t.test("challenge response includes error, decision, score, challenge object, and signals", async () => {
    const signals = [
      { key: "suspiciousUserAgent", triggered: true, score: 20, reason: "Bot UA" },
      { key: "missingJsBeacon",     triggered: true, score: 15, reason: "No beacon" },
      { key: "missingInteraction",  triggered: true, score: 10, reason: "No interaction" }
    ];
    const req = mockReq();
    req.aieeRisk = { decision: "challenge", score: 45, signals };
    const res = mockRes();
    await runMiddleware(mitigateMiddleware, req, res);

    assert.ok(res.body, "response body should be set");
    assert.strictEqual(res.body.error, "Challenge required by Aiee");
    assert.strictEqual(res.body.decision, "challenge");
    assert.strictEqual(res.body.score, 45);
    assert.ok(res.body.challenge, "challenge object should be present");
    assert.ok(typeof res.body.challenge.type === "string", "challenge.type should be a string");
    assert.ok(typeof res.body.challenge.instructions === "string", "challenge.instructions should be a string");
    assert.deepStrictEqual(res.body.signals, signals);
  });

  await t.test("challenge without token sets X-Aiee-Challenge-Pending: true", async () => {
    const req = mockReq();
    req.aieeRisk = { decision: "challenge", score: 45, signals: [] };
    const res = mockRes();
    await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(
      res.headers["x-aiee-challenge-pending"],
      "true",
      "X-Aiee-Challenge-Pending should be set when no token is supplied"
    );
  });

  // --- challenge with valid prototype token ---

  await t.test("challenge with x-aiee-challenge-token: prototype-pass calls next()", async () => {
    const req = mockReq({ "x-aiee-challenge-token": "prototype-pass" });
    req.aieeRisk = { decision: "challenge", score: 45, signals: [] };
    const res = mockRes();
    const { called } = await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(called, true, "next() should be called when prototype token is present");
  });

  await t.test("challenge with valid token sets X-Aiee-Challenge-Passed: true", async () => {
    const req = mockReq({ "x-aiee-challenge-token": "prototype-pass" });
    req.aieeRisk = { decision: "challenge", score: 45, signals: [] };
    const res = mockRes();
    await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(
      res.headers["x-aiee-challenge-passed"],
      "true",
      "X-Aiee-Challenge-Passed should be set when token is accepted"
    );
  });

  await t.test("challenge with valid token does NOT set X-Aiee-Challenge-Pending", async () => {
    const req = mockReq({ "x-aiee-challenge-token": "prototype-pass" });
    req.aieeRisk = { decision: "challenge", score: 45, signals: [] };
    const res = mockRes();
    await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(
      res.headers["x-aiee-challenge-pending"],
      undefined,
      "X-Aiee-Challenge-Pending should NOT be set when token is accepted"
    );
  });

  // --- block (unchanged from Step 4) ---

  await t.test("returns HTTP 429 for block decision and does not call next()", async () => {
    const req = mockReq();
    req.aieeRisk = {
      decision: "block",
      score: 95,
      signals: [{ key: "forcedBotForTesting", triggered: true, score: 100 }]
    };
    const res = mockRes();
    const { called } = await runMiddleware(mitigateMiddleware, req, res);

    assert.strictEqual(res.statusCode, 429, "status code should be 429");
    assert.strictEqual(called, false, "next() should NOT be called for block");
  });

  await t.test("blocked response includes error, decision, score, and signals", async () => {
    const signals = [
      { key: "forcedBotForTesting", triggered: true, score: 100, reason: "Test" }
    ];
    const req = mockReq();
    req.aieeRisk = { decision: "block", score: 100, signals };
    const res = mockRes();
    await runMiddleware(mitigateMiddleware, req, res);

    assert.ok(res.body, "response body should be set");
    assert.strictEqual(res.body.error, "Request blocked by Aiee");
    assert.strictEqual(res.body.decision, "block");
    assert.strictEqual(res.body.score, 100);
    assert.deepStrictEqual(res.body.signals, signals);
  });

  await t.test("blocked response score matches req.aieeRisk.score", async () => {
    const req = mockReq();
    req.aieeRisk = { decision: "block", score: 75, signals: [] };
    const res = mockRes();
    await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(res.body.score, 75);
  });

  await t.test("block with valid challenge token still returns 429", async () => {
    // Challenge token must NEVER bypass a block decision.
    const req = mockReq({ "x-aiee-challenge-token": "prototype-pass" });
    req.aieeRisk = { decision: "block", score: 100, signals: [] };
    const res = mockRes();
    const { called } = await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(res.statusCode, 429, "block must not be bypassed by challenge token");
    assert.strictEqual(called, false);
  });

  await t.test("does NOT set X-Aiee-Challenge-Pending for allow decision", async () => {
    const req = mockReq();
    req.aieeRisk = { decision: "allow", score: 10, signals: [] };
    const res = mockRes();
    await runMiddleware(mitigateMiddleware, req, res);
    assert.strictEqual(
      res.headers["x-aiee-challenge-pending"],
      undefined,
      "X-Aiee-Challenge-Pending should NOT be set for allow"
    );
  });
});

// ---------------------------------------------------------------------------
// Protected route integration tests (via Node http module + createApp)
// ---------------------------------------------------------------------------

// Medium-risk profile used across multiple challenge tests.
// UA: python-requests (+20) + no beacon (+15) + no interaction (+10) = 45 → challenge.
const MEDIUM_RISK_HEADERS = {
  "user-agent": "python-requests/2.31.0"
  // no x-aiee-js-beacon
  // no x-aiee-interaction
  // no x-aiee-force-bot
};

test("Protected route integration", async (t) => {
  // Spin up a real Express app on an ephemeral port for integration tests.
  const app = createApp();
  const server = http.createServer(app);
  const port = await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });

  // Clear session state before and after the entire suite to prevent leakage
  // into or from other test suites that share the same module-level store.
  t.before(() => clearAllSessions());
  t.after(() => {
    server.close();
    clearAllSessions();
  });

  // Each sub-test uses a unique x-forwarded-for IP so per-test request history
  // never leaks into sibling tests.
  const VALID_UUID = "8199449f-7a0d-4f83-9427-bdaeae2d507a";

  // --- human-like request (allow path) ---

  await t.test("human-like request returns HTTP 200 and the record", async () => {
    const { statusCode, headers, body } = await httpGet(
      port,
      `/api/compensation/${VALID_UUID}`,
      {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
        "x-aiee-js-beacon": "valid",
        "x-aiee-interaction": "true",
        "x-forwarded-for": "2.0.0.1"
      }
    );
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(headers["x-aiee-decision"], "allow");
    const record = JSON.parse(body);
    assert.strictEqual(record.uuid, VALID_UUID);
  });

  // --- medium-risk request without token (challenge path) ---

  await t.test("medium-risk request without challenge token returns HTTP 403", async () => {
    const { statusCode, headers } = await httpGet(
      port,
      `/api/compensation/${VALID_UUID}`,
      { ...MEDIUM_RISK_HEADERS, "x-forwarded-for": "2.0.0.2" }
    );
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(headers["x-aiee-decision"], "challenge");
  });

  await t.test("medium-risk request without token does not return the compensation record", async () => {
    const { body } = await httpGet(
      port,
      `/api/compensation/${VALID_UUID}`,
      { ...MEDIUM_RISK_HEADERS, "x-forwarded-for": "2.0.0.3" }
    );
    const parsed = JSON.parse(body);
    assert.strictEqual(parsed.decision, "challenge", "response should be challenge JSON");
    assert.ok(parsed.challenge, "challenge object should be present in 403 body");
    assert.strictEqual(parsed.uuid, undefined, "compensation record must not be returned");
  });

  // --- medium-risk request with valid prototype token (challenge-pass path) ---

  await t.test("medium-risk request with prototype-pass token returns HTTP 200 and the record", async () => {
    const { statusCode, headers, body } = await httpGet(
      port,
      `/api/compensation/${VALID_UUID}`,
      { ...MEDIUM_RISK_HEADERS, "x-aiee-challenge-token": "prototype-pass", "x-forwarded-for": "2.0.0.4" }
    );
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(headers["x-aiee-decision"], "challenge",
      "decision header should still read 'challenge' (that's what the detector assessed)");
    assert.strictEqual(headers["x-aiee-challenge-passed"], "true");
    const record = JSON.parse(body);
    assert.strictEqual(record.uuid, VALID_UUID, "compensation record should be returned after challenge pass");
  });

  // --- forced-bot request (block path) — token must NOT help ---

  await t.test("forced-bot request returns HTTP 429 with blocked JSON", async () => {
    const { statusCode, headers, body } = await httpGet(
      port,
      `/api/compensation/${VALID_UUID}`,
      {
        "user-agent": "python-requests/2.31.0",
        "x-aiee-force-bot": "true",
        "x-forwarded-for": "2.0.0.5"
      }
    );
    assert.strictEqual(statusCode, 429);
    assert.strictEqual(headers["x-aiee-decision"], "block");
    const response = JSON.parse(body);
    assert.strictEqual(response.error, "Request blocked by Aiee");
    assert.strictEqual(response.decision, "block");
    assert.strictEqual(typeof response.score, "number");
    assert.ok(Array.isArray(response.signals));
  });

  await t.test("forced-bot request with challenge token still returns HTTP 429", async () => {
    // Token must NEVER bypass a block decision.
    const { statusCode } = await httpGet(
      port,
      `/api/compensation/${VALID_UUID}`,
      {
        "user-agent": "python-requests/2.31.0",
        "x-aiee-force-bot": "true",
        "x-aiee-challenge-token": "prototype-pass",
        "x-forwarded-for": "2.0.0.6"
      }
    );
    assert.strictEqual(statusCode, 429, "block must not be bypassed by challenge token");
  });

  // --- burst-bot integration test (Step 6: real requestRate without force-bot) ---

  await t.test("burst bot eventually reaches 429 once requestRate triggers", async () => {
    // Use a dedicated IP so burst history doesn't pollute other tests.
    const burstIp = "2.0.1.1";
    const statuses = [];

    // Send 12 rapid requests — with suspicious UA (+20), no beacon (+15),
    // no interaction (+10): score starts at 45 (challenge).
    // After the 11th request in the same IP window, requestRate triggers (+35)
    // pushing total to 80 — block.
    for (let i = 0; i < 12; i++) {
      const { statusCode } = await httpGet(
        port,
        `/api/compensation/${VALID_UUID}`,
        {
          "user-agent": "python-requests/2.31.0",
          "x-forwarded-for": burstIp
          // no beacon, no interaction
        }
      );
      statuses.push(statusCode);
    }

    const hasBlock = statuses.some((s) => s === 429);
    assert.ok(
      hasBlock,
      `Expected at least one 429 in burst sequence. Got: ${statuses.join(", ")}`
    );
  });

  // --- sequential-path integration test (Step 6: real urlPattern without force-bot) ---

  await t.test("sequential numeric paths eventually reach 429", async () => {
    // Unique IP for this test.
    const seqIp = "2.0.1.2";
    const statuses = [];

    // /api/compensation/1, /2, /3 — sequential numeric IDs, same prefix.
    // Score per request: suspiciousUA +20, noBeacon +15, noInteraction +10 = 45 (challenge).
    // After the 3rd request, sequentialUrlPattern triggers (+25), total = 70 = block.
    for (let i = 1; i <= 4; i++) {
      const { statusCode, headers } = await httpGet(
        port,
        `/api/compensation/${i}`,
        {
          "user-agent": "python-requests/2.31.0",
          "x-forwarded-for": seqIp
          // no beacon, no interaction
        }
      );
      statuses.push(statusCode);
    }

    // At least one response must be 429 (block) once sequential pattern is detected.
    const hasBlock = statuses.some((s) => s === 429);
    assert.ok(
      hasBlock,
      `Expected at least one 429 in sequential path sequence. Got: ${statuses.join(", ")}`
    );
  });

  // --- health route is unaffected ---

  await t.test("/health returns HTTP 200 and has no X-Aiee-Decision header", async () => {
    const { statusCode, headers } = await httpGet(port, "/health");
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(
      headers["x-aiee-decision"],
      undefined,
      "/health should not have X-Aiee-Decision header"
    );
  });
});
