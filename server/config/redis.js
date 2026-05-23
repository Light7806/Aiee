// Redis connection configuration.
// TODO: create and export a Redis client using REDIS_URL.

export const redisConfig = {
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
};
