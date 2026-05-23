# Implementation Plan

## Phase 1: Server Foundation

- Start Express from `server/index.js`.
- Create `/health`.
- Create protected mock route `/api/compensation/:uuid`.
- Load records from `server/data/compensationRecords.json`.

## Phase 2: Detection Pipeline

- Add detector middleware.
- Run every detector for protected routes.
- Attach score details to the request object.

## Phase 3: Mitigation

- Allow low-risk traffic.
- Return a challenge response for medium-risk traffic.
- Return `429` for high-risk traffic.

## Phase 4: Analytics

- Record request decisions.
- Add `/api/analytics/live`.
- Feed dashboard components.

## Phase 5: Simulators

- Implement bot traffic.
- Implement human-like traffic.
- Compare both in the dashboard.

## Phase 6: Polish

- Add tests for scoring and detector behavior.
- Tune thresholds.
- Improve dashboard charts.
