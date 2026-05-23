// Unit tests for server/services/sessionStore.js
// Uses node:test and node:assert only — no external dependencies.

import { test } from "node:test";
import assert from "node:assert";
import {
  recordRequest,
  getRequestHistory,
  getRequestCountInWindow,
  getRecentPaths,
  getIntervalsMs,
  pruneOldRequests,
  clearSession,
  clearAllSessions
} from "../server/services/sessionStore.js";

// Always start each top-level test from a clean state.
// Individual subtests that share a client ID use a unique prefix to avoid
// leaking state into other suites.

test("sessionStore — recordRequest and getRequestHistory", async (t) => {
  t.beforeEach(() => clearAllSessions());
  t.after(() => clearAllSessions());

  await t.test("stores events for a client", () => {
    recordRequest("10.0.0.1", "/api/compensation/1", 1000);
    recordRequest("10.0.0.1", "/api/compensation/2", 1100);
    const history = getRequestHistory("10.0.0.1");
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].path, "/api/compensation/1");
    assert.strictEqual(history[0].timestampMs, 1000);
    assert.strictEqual(history[1].path, "/api/compensation/2");
  });

  await t.test("stores events independently per client ID", () => {
    recordRequest("10.0.0.2", "/a", 1000);
    recordRequest("10.0.0.3", "/b", 1000);
    assert.strictEqual(getRequestHistory("10.0.0.2").length, 1);
    assert.strictEqual(getRequestHistory("10.0.0.3").length, 1);
  });

  await t.test("returns empty array for unknown client", () => {
    const history = getRequestHistory("no-such-client");
    assert.deepStrictEqual(history, []);
  });

  await t.test("each event has path and timestampMs", () => {
    recordRequest("10.0.0.4", "/health", 5000);
    const [evt] = getRequestHistory("10.0.0.4");
    assert.ok("path" in evt);
    assert.ok("timestampMs" in evt);
    assert.strictEqual(evt.path, "/health");
    assert.strictEqual(evt.timestampMs, 5000);
  });

  await t.test("caps at 50 events, discarding oldest", () => {
    const id = "cap-test";
    // Insert 55 events with increasing timestamps so none get pruned
    // by the age-based pruner (they are all within 5 minutes).
    const base = Date.now();
    for (let i = 0; i < 55; i++) {
      recordRequest(id, `/path/${i}`, base + i * 1000);
    }
    const history = getRequestHistory(id);
    assert.strictEqual(history.length, 50, "should keep exactly 50 events");
    // The oldest retained event should be the 6th inserted (index 5)
    assert.ok(
      history[0].path === "/path/5",
      `oldest path should be /path/5, got ${history[0].path}`
    );
    // The newest retained event should be the last inserted (index 54)
    assert.ok(
      history[history.length - 1].path === "/path/54",
      `newest path should be /path/54`
    );
  });
});

test("sessionStore — getRequestCountInWindow", async (t) => {
  t.beforeEach(() => clearAllSessions());
  t.after(() => clearAllSessions());

  await t.test("counts only events inside the window", () => {
    const id = "rw-1";
    const now = 10_000;
    // 3 events inside the 5-second window, 2 outside
    recordRequest(id, "/a", now - 6000); // outside
    recordRequest(id, "/b", now - 7000); // outside
    recordRequest(id, "/c", now - 4000); // inside
    recordRequest(id, "/d", now - 2000); // inside
    recordRequest(id, "/e", now - 1000); // inside

    const count = getRequestCountInWindow(id, 5000, now);
    assert.strictEqual(count, 3);
  });

  await t.test("returns 0 for unknown client", () => {
    assert.strictEqual(getRequestCountInWindow("nobody", 60_000), 0);
  });

  await t.test("returns 0 when all events are outside the window", () => {
    const id = "rw-2";
    recordRequest(id, "/a", 1000);
    assert.strictEqual(getRequestCountInWindow(id, 100, 1200), 0);
  });

  await t.test("counts the event exactly at the boundary as outside (strict >)", () => {
    const id = "rw-3";
    const now = 2000;
    recordRequest(id, "/a", 1000); // exactly at cutoff (now - windowMs = 1000) — NOT included
    recordRequest(id, "/b", 1001); // 1 ms inside the window — included
    assert.strictEqual(getRequestCountInWindow(id, 1000, now), 1);
  });
});

test("sessionStore — getRecentPaths", async (t) => {
  t.beforeEach(() => clearAllSessions());
  t.after(() => clearAllSessions());

  await t.test("returns latest paths newest-last", () => {
    const id = "rp-1";
    recordRequest(id, "/a", 100);
    recordRequest(id, "/b", 200);
    recordRequest(id, "/c", 300);
    const paths = getRecentPaths(id, 3);
    assert.deepStrictEqual(paths, ["/a", "/b", "/c"]);
  });

  await t.test("respects the limit and returns only the most recent", () => {
    const id = "rp-2";
    for (let i = 1; i <= 10; i++) recordRequest(id, `/p/${i}`, i * 100);
    const paths = getRecentPaths(id, 3);
    assert.strictEqual(paths.length, 3);
    assert.deepStrictEqual(paths, ["/p/8", "/p/9", "/p/10"]);
  });

  await t.test("returns all events when fewer than limit exist", () => {
    const id = "rp-3";
    recordRequest(id, "/only", 1000);
    assert.deepStrictEqual(getRecentPaths(id, 5), ["/only"]);
  });

  await t.test("returns empty array for unknown client", () => {
    assert.deepStrictEqual(getRecentPaths("ghost", 5), []);
  });
});

test("sessionStore — getIntervalsMs", async (t) => {
  t.beforeEach(() => clearAllSessions());
  t.after(() => clearAllSessions());

  await t.test("computes correct intervals between timestamps", () => {
    const id = "iv-1";
    recordRequest(id, "/a", 1000);
    recordRequest(id, "/b", 1100);
    recordRequest(id, "/c", 1200);
    recordRequest(id, "/d", 1300);
    const intervals = getIntervalsMs(id, 5);
    assert.deepStrictEqual(intervals, [100, 100, 100]);
  });

  await t.test("respects limit — uses only the N most recent events", () => {
    const id = "iv-2";
    // 6 events, but limit is 4, so only the last 4 contribute 3 intervals
    recordRequest(id, "/a", 1000);
    recordRequest(id, "/b", 1100);
    recordRequest(id, "/c", 2000); // big gap before this group
    recordRequest(id, "/d", 2100);
    recordRequest(id, "/e", 2200);
    recordRequest(id, "/f", 2300);
    const intervals = getIntervalsMs(id, 4);
    assert.deepStrictEqual(intervals, [100, 100, 100]);
  });

  await t.test("returns empty array when fewer than 2 events exist", () => {
    const id = "iv-3";
    recordRequest(id, "/a", 1000);
    assert.deepStrictEqual(getIntervalsMs(id, 5), []);
  });

  await t.test("returns empty array for unknown client", () => {
    assert.deepStrictEqual(getIntervalsMs("nobody", 5), []);
  });
});

test("sessionStore — pruneOldRequests", async (t) => {
  t.beforeEach(() => clearAllSessions());
  t.after(() => clearAllSessions());

  await t.test("removes events older than maxAgeMs", () => {
    const id = "pr-1";
    recordRequest(id, "/old", 1000);
    recordRequest(id, "/also-old", 2000);
    recordRequest(id, "/recent", 9000);
    pruneOldRequests(id, 5000, 10_000); // cutoff at 5000
    const history = getRequestHistory(id);
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].path, "/recent");
  });

  await t.test("removes all events when all are stale", () => {
    const id = "pr-2";
    recordRequest(id, "/a", 1000);
    recordRequest(id, "/b", 2000);
    pruneOldRequests(id, 1000, 5000); // cutoff at 4000 — both stale
    assert.strictEqual(getRequestHistory(id).length, 0);
  });

  await t.test("is a no-op for unknown client", () => {
    assert.doesNotThrow(() => pruneOldRequests("ghost", 1000));
  });
});

test("sessionStore — clearSession and clearAllSessions", async (t) => {
  t.after(() => clearAllSessions());

  await t.test("clearSession removes only the specified client", () => {
    recordRequest("keep-1", "/a", 1000);
    recordRequest("remove-1", "/b", 1000);
    clearSession("remove-1");
    assert.strictEqual(getRequestHistory("remove-1").length, 0);
    assert.strictEqual(getRequestHistory("keep-1").length, 1);
    clearSession("keep-1");
  });

  await t.test("clearAllSessions removes all clients", () => {
    recordRequest("x", "/a", 1000);
    recordRequest("y", "/b", 1000);
    recordRequest("z", "/c", 1000);
    clearAllSessions();
    assert.strictEqual(getRequestHistory("x").length, 0);
    assert.strictEqual(getRequestHistory("y").length, 0);
    assert.strictEqual(getRequestHistory("z").length, 0);
  });

  await t.test("clearSession on unknown client is a no-op", () => {
    assert.doesNotThrow(() => clearSession("nonexistent"));
  });
});
