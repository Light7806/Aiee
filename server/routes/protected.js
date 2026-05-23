// Protected mock compensation data routes.
// Bot detection middleware is mounted only on the compensation route,
// leaving /health and other utility routes unaffected.

import { findByUuid } from "../services/compensationStore.js";
import { detectorMiddleware } from "../middleware/detector.js";
import { mitigateMiddleware } from "../middleware/mitigate.js";

/**
 * Registers protected routes on the Express app.
 *
 * Route pipeline for GET /api/compensation/:uuid:
 *   1. detectorMiddleware  — runs signal detectors, attaches req.aieeRisk, sets headers.
 *   2. mitigateMiddleware  — blocks high-risk requests (429) or passes low/medium through.
 *   3. handler             — looks up and returns the compensation record.
 *
 * @param {import('express').Application} app
 */
export function registerProtectedRoutes(app) {
  app.get(
    "/api/compensation/:uuid",
    detectorMiddleware,
    mitigateMiddleware,
    (req, res) => {
      const { uuid } = req.params;
      const record = findByUuid(uuid);

      if (!record) {
        return res.status(404).json({ error: "Compensation record not found" });
      }

      res.json(record);
    }
  );
}
