// In-memory session/request history store.
//
// Tracks recent request events per client (keyed by IP for this prototype).
// Designed to be pure and synchronous — no Redis, no file I/O, no external deps.
//
// Redis will replace this in a later step. The API surface is intentionally
// narrow so that swap-out only touches this file and its callers.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum events retained per client to prevent unbounded memory growth. */
const MAX_EVENTS_PER_CLIENT = 50;

/** Events older than this are considered stale and pruned automatically. */
const SESSION_MAX_AGE_MS = 5 * 60_000; // 5 minutes

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/**
 * Map of clientId → array of request events sorted oldest-first.
 * Each event: { path: string, timestampMs: number }
 *
 * @type {Map<string, Array<{ path: string, timestampMs: number }>>}
 */
const store = new Map();

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Returns the event array for a client, creating it if absent.
 * @param {string} clientId
 * @returns {Array<{ path: string, timestampMs: number }>}
 */
function getOrCreate(clientId) {
  if (!store.has(clientId)) {
    store.set(clientId, []);
  }
  return store.get(clientId);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Records a single request event for a client.
 * Automatically prunes stale events and enforces the per-client cap.
 *
 * @param {string} clientId        - Client identifier (IP address)
 * @param {string} path            - URL path of the request
 * @param {number} [timestampMs]   - Override timestamp (defaults to Date.now())
 */
export function recordRequest(clientId, path, timestampMs = Date.now()) {
  const events = getOrCreate(clientId);

  // Prune stale events first to keep the array small before appending.
  pruneOldRequests(clientId, SESSION_MAX_AGE_MS, timestampMs);

  events.push({ path, timestampMs });

  // Cap the array to the most recent MAX_EVENTS_PER_CLIENT entries.
  if (events.length > MAX_EVENTS_PER_CLIENT) {
    events.splice(0, events.length - MAX_EVENTS_PER_CLIENT);
  }
}

/**
 * Returns the full event history for a client (oldest-first).
 * Returns an empty array for unknown clients.
 *
 * @param {string} clientId
 * @returns {Array<{ path: string, timestampMs: number }>}
 */
export function getRequestHistory(clientId) {
  return store.get(clientId) ?? [];
}

/**
 * Counts how many events fall within the trailing `windowMs` milliseconds.
 *
 * @param {string} clientId
 * @param {number} windowMs   - Window size in milliseconds (e.g. 60_000 for 1 min)
 * @param {number} [nowMs]    - Override current time (defaults to Date.now())
 * @returns {number}
 */
export function getRequestCountInWindow(clientId, windowMs, nowMs = Date.now()) {
  const events = store.get(clientId) ?? [];
  const cutoff = nowMs - windowMs;
  return events.filter((e) => e.timestampMs > cutoff).length;
}

/**
 * Returns the paths of the most recent `limit` requests, newest-last.
 * If fewer than `limit` events exist, returns all of them.
 *
 * @param {string} clientId
 * @param {number} [limit]
 * @returns {string[]}
 */
export function getRecentPaths(clientId, limit = 5) {
  const events = store.get(clientId) ?? [];
  return events.slice(-limit).map((e) => e.path);
}

/**
 * Computes inter-request intervals (ms) from the most recent `limit` events.
 * With N events there are N-1 intervals.
 * Returns an empty array if fewer than 2 events exist.
 *
 * Example: timestamps [1000, 1100, 1200] → intervals [100, 100]
 *
 * @param {string} clientId
 * @param {number} [limit]
 * @returns {number[]}
 */
export function getIntervalsMs(clientId, limit = 5) {
  const events = store.get(clientId) ?? [];
  const recent = events.slice(-limit);
  if (recent.length < 2) return [];

  const intervals = [];
  for (let i = 1; i < recent.length; i++) {
    intervals.push(recent[i].timestampMs - recent[i - 1].timestampMs);
  }
  return intervals;
}

/**
 * Removes all events older than `maxAgeMs` for a specific client.
 *
 * @param {string} clientId
 * @param {number} maxAgeMs
 * @param {number} [nowMs]
 */
export function pruneOldRequests(clientId, maxAgeMs, nowMs = Date.now()) {
  const events = store.get(clientId);
  if (!events) return;

  const cutoff = nowMs - maxAgeMs;
  const firstValid = events.findIndex((e) => e.timestampMs > cutoff);

  if (firstValid === -1) {
    // All events are stale — clear the array in place.
    events.length = 0;
  } else if (firstValid > 0) {
    events.splice(0, firstValid);
  }
}

/**
 * Removes all stored events for a specific client.
 * Use in tests to prevent state pollution between test cases.
 *
 * @param {string} clientId
 */
export function clearSession(clientId) {
  store.delete(clientId);
}

/**
 * Removes all stored events for every client.
 * Use in tests to reset the full store between test suites.
 */
export function clearAllSessions() {
  store.clear();
}
