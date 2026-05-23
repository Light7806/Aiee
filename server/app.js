// Express app composition lives here.
// TODO:
// - configure JSON middleware
// - mount health route
// - mount protected routes behind detector + mitigation middleware
// - mount analytics/admin routes

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerHealthRoutes } from "./routes/health.js";
import { registerProtectedRoutes } from "./routes/protected.js";

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Routes
  registerHealthRoutes(app);
  registerProtectedRoutes(app);

  // Serve static frontend in production
  if (process.env.NODE_ENV === "production") {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const clientDistPath = path.join(__dirname, "../client/dist");
    
    app.use(express.static(clientDistPath));
    app.use((req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
