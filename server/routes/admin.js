// Admin controls for whitelist and active block list.

export function registerAdminRoutes(app) {
  app.post("/api/whitelist/:ip", (req, res) => {
    res.status(501).json({ error: "Whitelist route not implemented yet." });
  });

  app.delete("/api/block/:ip", (req, res) => {
    res.status(501).json({ error: "Block removal route not implemented yet." });
  });
}
