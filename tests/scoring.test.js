// Tests for the risk scoring engine.

import { test } from "node:test";
import assert from "node:assert";
import {
  normalizeScore,
  getDecision,
  calculateRisk
} from "../server/services/riskScoring.js";

test("normalizeScore clamps values to [0, 100]", async (t) => {
  await t.test("should return 0 for negative score", () => {
    assert.strictEqual(normalizeScore(-50), 0);
  });

  await t.test("should return 100 for score above 100", () => {
    assert.strictEqual(normalizeScore(130), 100);
  });

  await t.test("should return score unchanged within range", () => {
    assert.strictEqual(normalizeScore(50), 50);
    assert.strictEqual(normalizeScore(0), 0);
    assert.strictEqual(normalizeScore(100), 100);
  });
});

test("getDecision returns correct category for normalized score", async (t) => {
  await t.test("should return 'allow' for score 0-29", () => {
    assert.strictEqual(getDecision(0), "allow");
    assert.strictEqual(getDecision(15), "allow");
    assert.strictEqual(getDecision(29), "allow");
  });

  await t.test("should return 'challenge' for score 30-69", () => {
    assert.strictEqual(getDecision(30), "challenge");
    assert.strictEqual(getDecision(50), "challenge");
    assert.strictEqual(getDecision(69), "challenge");
  });

  await t.test("should return 'block' for score 70-100", () => {
    assert.strictEqual(getDecision(70), "block");
    assert.strictEqual(getDecision(85), "block");
    assert.strictEqual(getDecision(100), "block");
  });
});

test("calculateRisk combines detector results into risk assessment", async (t) => {
  await t.test("should return score 0 and 'allow' for empty detector results", () => {
    const result = calculateRisk([]);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.decision, "allow");
    assert.deepStrictEqual(result.signals, []);
  });

  await t.test("should return 'challenge' for single medium signal (score 35)", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 35,
        reason: "More than 10 requests in one minute"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 35);
    assert.strictEqual(result.decision, "challenge");
    assert.strictEqual(result.signals.length, 1);
  });

  await t.test("should preserve signal breakdown in result", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 35,
        reason: "More than 10 requests in one minute"
      },
      {
        key: "suspiciousUserAgent",
        triggered: true,
        score: 20,
        reason: "Unknown bot user agent"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.signals.length, 2);
    assert.deepStrictEqual(result.signals[0].key, "highRequestRate");
    assert.deepStrictEqual(result.signals[1].key, "suspiciousUserAgent");
  });
});

test("calculateRisk handles multiple bot-like signals", async (t) => {
  await t.test("should return 'block' for multiple signals totaling 95", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 35,
        reason: "More than 10 requests in one minute"
      },
      {
        key: "sequentialUrlPattern",
        triggered: true,
        score: 25,
        reason: "Sequential URL pattern detected"
      },
      {
        key: "suspiciousUserAgent",
        triggered: true,
        score: 20,
        reason: "Unknown bot user agent"
      },
      {
        key: "missingJsBeacon",
        triggered: true,
        score: 15,
        reason: "Missing JS beacon"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 95);
    assert.strictEqual(result.decision, "block");
  });
});

test("calculateRisk handles score normalization", async (t) => {
  await t.test("should clamp raw score above 100 to 100 and block", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 35,
        reason: "High request rate"
      },
      {
        key: "sequentialUrlPattern",
        triggered: true,
        score: 25,
        reason: "Sequential patterns"
      },
      {
        key: "suspiciousUserAgent",
        triggered: true,
        score: 20,
        reason: "Suspicious user agent"
      },
      {
        key: "missingJsBeacon",
        triggered: true,
        score: 15,
        reason: "Missing JS beacon"
      },
      {
        key: "missingInteraction",
        triggered: true,
        score: 10,
        reason: "Missing interaction"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 100); // Raw score 105 clamped to 100
    assert.strictEqual(result.decision, "block");
  });

  await t.test("should clamp negative raw score to 0 and allow", () => {
    const detectorResults = [
      {
        key: "knownSearchCrawler",
        triggered: true,
        score: -50,
        reason: "Known search crawler"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.decision, "allow");
  });
});

test("calculateRisk respects boundary thresholds", async (t) => {
  await t.test("should return 'allow' at boundary score 29", () => {
    const detectorResults = [
      {
        key: "missingJsBeacon",
        triggered: true,
        score: 15,
        reason: "Missing JS beacon"
      },
      {
        key: "missingInteraction",
        triggered: true,
        score: 14,
        reason: "Missing interaction"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 29);
    assert.strictEqual(result.decision, "allow");
  });

  await t.test("should return 'challenge' at boundary score 30", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 30,
        reason: "High request rate"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 30);
    assert.strictEqual(result.decision, "challenge");
  });

  await t.test("should return 'challenge' at boundary score 69", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 35,
        reason: "High request rate"
      },
      {
        key: "sequentialUrlPattern",
        triggered: true,
        score: 34,
        reason: "Sequential patterns"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 69);
    assert.strictEqual(result.decision, "challenge");
  });

  await t.test("should return 'block' at boundary score 70", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 35,
        reason: "High request rate"
      },
      {
        key: "sequentialUrlPattern",
        triggered: true,
        score: 35,
        reason: "Sequential patterns"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 70);
    assert.strictEqual(result.decision, "block");
  });
});

test("calculateRisk integrates detector signals correctly", async (t) => {
  await t.test("should combine multiple detector results into one score", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 35,
        reason: "More than 10 requests in one minute"
      },
      {
        key: "suspiciousUserAgent",
        triggered: true,
        score: 20,
        reason: "Unknown bot user agent"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 55);
    assert.strictEqual(result.decision, "challenge");
    assert.deepStrictEqual(result.signals, detectorResults);
  });

  await t.test("should include both positive and negative signals", () => {
    const detectorResults = [
      {
        key: "highRequestRate",
        triggered: true,
        score: 35,
        reason: "High request rate"
      },
      {
        key: "knownSearchCrawler",
        triggered: true,
        score: -50,
        reason: "Known search crawler like Googlebot"
      }
    ];
    const result = calculateRisk(detectorResults);
    assert.strictEqual(result.score, 0); // -15 clamped to 0
    assert.strictEqual(result.decision, "allow");
    assert.strictEqual(result.signals.length, 2);
  });
});
