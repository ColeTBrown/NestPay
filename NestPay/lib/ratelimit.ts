import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Distributed rate limiting backed by Upstash Redis (REST). Server-only.
//
// Module-load guard: throw immediately if the Upstash env vars are missing.
// Without this the Redis client would construct with `undefined` creds and
// every .limit() call would fail — and since most of our limiters fail OPEN,
// that failure would be silent (rate limiting effectively disabled). Throwing
// at cold start surfaces the misconfig on the very first Vercel deploy.
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('[ratelimit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required')
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Per-endpoint limiters. Numbers are first-draft conservative (real-user
// behaviour + 3-5x margin); all tunable from this one file post-launch.
//   - landlordCode: pre-auth brute-force surface (per-IP). 10/min.
//   - sendReminder / aiBriefing / payment / qbConnect / stripeConnect:
//     authed, keyed by user id. Threat is abuse / cost-amplification.
const limiters = {
  landlordCode:  new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(10, '1 m'),    prefix: 'rl:lc' }),
  sendReminder:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 h'),  prefix: 'rl:sr' }),
  aiBriefing:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 h'),  prefix: 'rl:ai' }),
  payment:       new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'),  prefix: 'rl:pi' }),
  qbConnect:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '10 m'), prefix: 'rl:qb' }),
  stripeConnect: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '10 m'), prefix: 'rl:sc' }),
}

export type LimiterKey = keyof typeof limiters
type FailMode = 'closed' | 'open'

// Fail closed ONLY where a failure-open reopens a brute-force / auth-bypass
// surface. landlordCode is the lone pre-auth brute-force target, so if Upstash
// is unreachable we'd rather 503 than let unlimited guesses through. Every
// authed endpoint fails OPEN (with a loud log) so an Upstash outage degrades
// abuse protection rather than breaking core product workflows (rent
// reminders, payments, onboarding).
const failModes: Record<LimiterKey, FailMode> = {
  landlordCode:  'closed',
  sendReminder:  'open',
  aiBriefing:    'open',
  payment:       'open',
  qbConnect:     'open',
  stripeConnect: 'open',
}

function rateLimitHeaders(limit: number, remaining: number, reset: number) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  }
}

// Returns a NextResponse (429 if limited, 503 if a fail-closed limiter can't
// reach Upstash) to short-circuit the handler, or null to proceed.
export async function rateLimit(
  key: LimiterKey,
  identifier: string,
): Promise<NextResponse | null> {
  try {
    const { success, limit, remaining, reset } = await limiters[key].limit(identifier)
    if (success) return null
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(limit, remaining, reset) },
    )
  } catch (err: any) {
    // Structured so a future log-based alerting layer can parse it.
    console.error(
      `[ratelimit:error] key=${key} identifier=${identifier} err=${err?.message ?? err}`,
    )
    if (failModes[key] === 'closed') {
      return NextResponse.json({ error: 'Rate limit service unavailable' }, { status: 503 })
    }
    return null // fail open
  }
}

// Best-effort client IP for pre-auth limiters. On Vercel, x-forwarded-for is
// set by the platform; the left-most entry is the client. Falls back to a
// constant so a missing header buckets everyone together (fail-closed-ish:
// shared bucket is stricter, not looser) rather than throwing.
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
