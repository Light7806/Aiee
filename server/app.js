// Express app composition lives here.
// TODO:
// - configure JSON middleware
// - mount health route
// - mount protected routes behind detector + mitigation middleware
// - mount analytics/admin routes

import express from "express";
import { registerHealthRoutes } from "./routes/health.js";
import { registerProtectedRoutes } from "./routes/protected.js";

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Routes
  registerHealthRoutes(app);
  registerProtectedRoutes(app);

  return app;
}
