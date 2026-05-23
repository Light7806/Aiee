// Tests for individual detector modules.

import { test } from "node:test";
import assert from "node:assert";
import { detectRequestRate } from "../server/detectors/requestRate.js";
import { detectUrlPattern } from "../server/detectors/urlPattern.js";
import { detectUserAgent } from "../server/detectors/userAgent.js";
import { detectJsBeacon } from "../server/detectors/jsBeacon.js";
import { detectInteraction } from "../server/detectors/interaction.js";
import { detectTimingVariance } from "../server/detectors/timingVariance.js";
import { detectCrawlerWhitelist } from "../server/detectors/crawlerWhitelist.js";

test("detectRequestRate", async (t) => {
  await t.test("should trigger when requests exceed limit", () => {
    const result = detectRequestRate({
      requestCountInWindow: 11,
      limit: 10
    });
    assert.strictEqual(result.key, "highRequestRate");
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 35);
    assert(result.reason.includes("11"));
  });

  await t.test("should not trigger when requests equal limit", () => {
    const result = detectRequestRate({
      requestCountInWindow: 10,
      limit: 10
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should not trigger when requests below limit", () => {
    const result = detectRequestRate({
      requestCountInWindow: 5,
      limit: 10
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should include meta with request details", () => {
    const result = detectRequestRate({
      requestCountInWindow: 15,
      limit: 10
    });
    assert.deepStrictEqual(result.meta, {
      requestCountInWindow: 15,
      limit: 10
    });
  });
});

test("detectUrlPattern", async (t) => {
  await t.test("should trigger for sequential compensation paths", () => {
    const result = detectUrlPattern({
      recentPaths: [
        "/api/compensation/1",
        "/api/compensation/2",
        "/api/compensation/3"
      ]
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 25);
  });

  await t.test("should trigger for sequential data paths", () => {
    const result = detectUrlPattern({
      recentPaths: ["/data/101", "/data/102", "/data/103"]
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 25);
  });

  await t.test("should not trigger for UUID compensation paths", () => {
    const result = detectUrlPattern({
      recentPaths: [
        "/api/compensation/8199449f-7a0d-4f83-9427-bdaeae2d507a",
        "/api/compensation/9299449f-7a0d-4f83-9427-bdaeae2d507a",
        "/api/compensation/a399449f-7a0d-4f83-9427-bdaeae2d507a"
      ]
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should not trigger for random non-sequential paths", () => {
    const result = detectUrlPattern({
      recentPaths: ["/api/users/10", "/api/posts/50", "/api/comments/25"]
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should not trigger with fewer than 3 paths", () => {
    const result = detectUrlPattern({
      recentPaths: ["/api/compensation/1", "/api/compensation/2"]
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should not trigger for empty paths", () => {
    const result = detectUrlPattern({
      recentPaths: []
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should not trigger for reverse sequential order", () => {
    const result = detectUrlPattern({
      recentPaths: [
        "/api/compensation/5",
        "/api/compensation/4",
        "/api/compensation/3"
      ]
    });
    assert.strictEqual(result.triggered, false);
  });

  await t.test("should not trigger for same route paths with numeric gaps", () => {
    const result = detectUrlPattern({
      recentPaths: [
        "/api/compensation/1",
        "/api/compensation/20",
        "/api/compensation/40"
      ]
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test(
    "should not trigger for different route prefixes with increasing numbers",
    () => {
      const result = detectUrlPattern({
        recentPaths: ["/api/users/10", "/api/posts/20", "/api/comments/30"]
      });
      assert.strictEqual(result.triggered, false);
      assert.strictEqual(result.score, 0);
    }
  );

  await t.test("should include meta with extracted IDs", () => {
    const result = detectUrlPattern({
      recentPaths: ["/api/compensation/1", "/api/compensation/2"]
    });
    assert(result.meta);
    assert(result.meta.extractedIds || result.meta.pathCount);
  });
});

test("detectUserAgent", async (t) => {
  await t.test("should trigger for empty user agent", () => {
    const result = detectUserAgent({
      userAgent: ""
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 20);
  });

  await t.test("should trigger for missing user agent", () => {
    const result = detectUserAgent({
      userAgent: null
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 20);
  });

  await t.test("should trigger for python-requests", () => {
    const result = detectUserAgent({
      userAgent: "python-requests/2.25.1"
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 20);
  });

  await t.test("should trigger for curl", () => {
    const result = detectUserAgent({
      userAgent: "curl/7.64.1"
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 20);
  });

  await t.test("should trigger for HeadlessChrome", () => {
    const result = detectUserAgent({
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/91.0.4472.124 Safari/537.36"
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 20);
  });

  await t.test("should be case-insensitive", () => {
    const result = detectUserAgent({
      userAgent: "PYTHON-REQUESTS/2.25.1"
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 20);
  });

  await t.test("should not trigger for normal Chrome user agent", () => {
    const result = detectUserAgent({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should not trigger for normal Firefox user agent", () => {
    const result = detectUserAgent({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0"
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should include meta with matched pattern", () => {
    const result = detectUserAgent({
      userAgent: "python-requests/2.25.1"
    });
    assert.strictEqual(result.meta.matchedPattern, "python-requests");
  });
});

test("detectJsBeacon", async (t) => {
  await t.test("should trigger when JS beacon is missing", () => {
    const result = detectJsBeacon({
      hasValidJsBeacon: false
    });
    assert.strictEqual(result.key, "missingJsBeacon");
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 15);
  });

  await t.test("should not trigger when JS beacon is present", () => {
    const result = detectJsBeacon({
      hasValidJsBeacon: true
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });
});

test("detectInteraction", async (t) => {
  await t.test("should trigger when interaction is missing", () => {
    const result = detectInteraction({
      hasInteraction: false
    });
    assert.strictEqual(result.key, "missingInteraction");
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 10);
  });

  await t.test("should not trigger when interaction is detected", () => {
    const result = detectInteraction({
      hasInteraction: true
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });
});

test("detectTimingVariance", async (t) => {
  await t.test("should trigger for regular intervals like [100, 105, 98, 102]", () => {
    const result = detectTimingVariance({
      intervalsMs: [100, 105, 98, 102],
      minVarianceMs: 50
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 20);
    assert(result.meta.standardDeviation < 50);
  });

  await t.test(
    "should not trigger for irregular intervals like [100, 900, 240, 1500]",
    () => {
      const result = detectTimingVariance({
        intervalsMs: [100, 900, 240, 1500],
        minVarianceMs: 50
      });
      assert.strictEqual(result.triggered, false);
      assert.strictEqual(result.score, 0);
      assert(result.meta.standardDeviation > 50);
    }
  );

  await t.test("should not trigger with fewer than 3 intervals", () => {
    const result = detectTimingVariance({
      intervalsMs: [100, 105],
      minVarianceMs: 50
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should use default minVarianceMs of 50", () => {
    const result = detectTimingVariance({
      intervalsMs: [100, 105, 98, 102]
      // minVarianceMs not provided, should default to 50
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, 20);
  });

  await t.test("should include meta with standard deviation", () => {
    const result = detectTimingVariance({
      intervalsMs: [100, 105, 98, 102],
      minVarianceMs: 50
    });
    assert.strictEqual(typeof result.meta.standardDeviation, "number");
    assert(result.meta.standardDeviation > 0);
  });
});

test("detectCrawlerWhitelist", async (t) => {
  await t.test("should trigger for Googlebot", () => {
    const result = detectCrawlerWhitelist({
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)"
    });
    assert.strictEqual(result.key, "knownSearchCrawler");
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, -50);
    assert.strictEqual(result.meta.matchedCrawler, "Googlebot");
  });

  await t.test("should trigger for Bingbot", () => {
    const result = detectCrawlerWhitelist({
      userAgent: "Mozilla/5.0 (compatible; bingbot/2.0)"
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, -50);
  });

  await t.test("should return negative score when triggered", () => {
    const result = detectCrawlerWhitelist({
      userAgent: "DuckDuckBot/1.0"
    });
    assert.strictEqual(result.score, -50);
  });

  await t.test("should not trigger for normal browser user agent", () => {
    const result = detectCrawlerWhitelist({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should not trigger for suspicious script UA (not in whitelist)", () => {
    const result = detectCrawlerWhitelist({
      userAgent: "python-requests/2.25.1"
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });

  await t.test("should be case-insensitive", () => {
    const result = detectCrawlerWhitelist({
      userAgent: "GOOGLEBOT/2.1"
    });
    assert.strictEqual(result.triggered, true);
    assert.strictEqual(result.score, -50);
  });

  await t.test("should not trigger for empty user agent", () => {
    const result = detectCrawlerWhitelist({
      userAgent: ""
    });
    assert.strictEqual(result.triggered, false);
    assert.strictEqual(result.score, 0);
  });
});
