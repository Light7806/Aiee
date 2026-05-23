// Analytics API for the React dashboard.

export function registerAnalyticsRoutes(app) {
  app.get("/api/analytics/live", (req, res) => {
    res.status(501).json({ error: "Analytics route not implemented yet." });
  });
}
