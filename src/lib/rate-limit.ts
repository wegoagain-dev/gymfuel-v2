import "server-only"

import { headers } from "next/headers"

/**
 * A small in-memory limiter for sign-in and sign-up. GymFuel runs as one container, so a Map in
 * the server process is enough; with more replicas this would need a shared store (Postgres or Redis).
 * Each key keeps the timestamps of its recent attempts inside a sliding window.
 */
type Limit = { limit: number; windowMs: number }

const buckets = new Map<string, number[]>()
let lastSweep = 0

function sweep(now: number, maxWindowMs: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, hits] of buckets) {
    if (!hits.length || now - hits[hits.length - 1] > maxWindowMs) buckets.delete(key)
  }
}

/** Records one attempt for `key`. Returns how long to wait when the key is over its limit, otherwise null. */
export function hit(key: string, { limit, windowMs }: Limit, now = Date.now()): { retryAfterMs: number } | null {
  sweep(now, windowMs)
  const hits = (buckets.get(key) ?? []).filter((at) => now - at < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return { retryAfterMs: windowMs - (now - hits[0]) }
  }
  hits.push(now)
  buckets.set(key, hits)
  return null
}

/** Forget a key, e.g. an email after a successful sign-in. */
export function reset(key: string) {
  buckets.delete(key)
}

/**
 * The visitor's IP. Behind Cloudflare the real address is in CF-Connecting-IP; behind the
 * Tailscale ingress or another proxy, the first X-Forwarded-For entry.
 */
export async function clientIp() {
  const h = await headers()
  return (
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  )
}

export function waitMessage(retryAfterMs: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000))
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
}

/** Sign-in: 20 tries per IP and 5 per email address every 15 minutes. Sign-up: 5 accounts per IP an hour. */
export const LIMITS = {
  loginPerIp: { limit: 20, windowMs: 15 * 60_000 },
  loginPerEmail: { limit: 5, windowMs: 15 * 60_000 },
  registerPerIp: { limit: 5, windowMs: 60 * 60_000 },
} satisfies Record<string, Limit>
