// Records request outcomes for the dashboard.
// TODO: store rolling analytics events in Redis or memory for the mock prototype.

export function analyticsMiddleware(req, res, next) {
  next();
}
