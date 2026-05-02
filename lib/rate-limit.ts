import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Lightweight per-route rate limiting backed by Upstash Redis.
 *
 * Design:
 *  - Fail-open if Upstash isn't configured (UPSTASH_REDIS_REST_URL or
 *    _TOKEN missing). This keeps local dev frictionless and means a
 *    misconfigured Vercel env var won't take down production traffic —
 *    it will just temporarily disable rate limiting.
 *  - Sliding-window algorithm so bursts at the boundary are smoothed.
 *  - Per-route, per-key namespacing so different routes don't share
 *    counters. Pass `key` as a userId for authed routes (more fair than
 *    IP) or omit to fall back to client IP.
 *  - Limiters are cached per (name, limit, window) tuple so we don't
 *    re-instantiate Ratelimit on every request.
 */

type Duration = `${number} ${"s" | "m" | "h" | "d"}`;

export type RateLimitOptions = {
  /** Identifier for this limiter; used as the Redis key prefix. */
  name: string;
  /** Max successful requests within the window. */
  limit: number;
  /** Window duration, e.g. "1 m", "1 h", "1 d". */
  window: Duration;
  /**
   * Override the per-request key. Defaults to the first
   * x-forwarded-for IP. Pass a stable userId on authenticated routes so
   * rate limits are per-user rather than per-IP.
   */
  key?: string;
};

export type RateLimitOutcome =
  | { allowed: true }
  | { allowed: false; response: Response };

let cachedRedis: Redis | null = null;
let redisInitAttempted = false;

function getRedis(): Redis | null {
  if (redisInitAttempted) return cachedRedis;
  redisInitAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "Memora: rate limiter disabled — UPSTASH_REDIS_REST_URL/_TOKEN not set",
    );
    return null;
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(
  name: string,
  limit: number,
  window: Duration,
): Ratelimit | null {
  const cacheKey = `${name}|${limit}|${window}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) return null;
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `memora:rl:${name}`,
    analytics: false,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // Last resort — better to share a bucket than to crash. In practice
  // Vercel always sets x-forwarded-for, so this branch is unreachable
  // in production.
  return "unknown";
}

export async function checkRateLimit(
  request: Request,
  opts: RateLimitOptions,
): Promise<RateLimitOutcome> {
  const limiter = getLimiter(opts.name, opts.limit, opts.window);
  if (!limiter) {
    // Upstash not configured — fail open.
    return { allowed: true };
  }

  const identifier = opts.key ?? getClientIp(request);

  let result: Awaited<ReturnType<Ratelimit["limit"]>>;
  try {
    result = await limiter.limit(identifier);
  } catch (err) {
    // Upstash hiccup — fail open rather than 500-ing real users. Log so
    // it surfaces in Sentry for follow-up.
    console.error("Memora: rate limit check failed, falling open", {
      name: opts.name,
      err,
    });
    return { allowed: true };
  }

  if (result.success) return { allowed: true };

  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );

  return {
    allowed: false,
    response: new Response(
      JSON.stringify({
        error:
          "You're going a little fast. Please wait a moment and try again.",
        code: "RATE_LIMITED",
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retryAfterSec),
          "x-ratelimit-limit": String(result.limit),
          "x-ratelimit-remaining": String(result.remaining),
          "x-ratelimit-reset": String(result.reset),
        },
      },
    ),
  };
}
