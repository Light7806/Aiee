// Health-check route.
// TODO: return server and Redis status.

export function registerHealthRoutes(app) {
  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "aiee", status: "healthy" });
  });
}
