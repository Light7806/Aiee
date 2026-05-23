// Redis-backed sliding-window rate limiter.
// TODO: track request counts per IP and session.

export function rateLimitMiddleware(req, res, next) {
  next();
}
