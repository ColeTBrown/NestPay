import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { rateLimit, getClientIp } from '@/lib/ratelimit'

// Pre-signup gate. Cannot use session auth because the user has no account
// yet — so it's rate-limited per-IP, FAIL-CLOSED (an Upstash outage 503s
// rather than reopening the brute-force window). Known limitation: per-IP is
// defeated by residential-proxy rotation; out of scope (would need
// IP-reputation / device fingerprinting).

export async function POST(req: NextRequest) {
  const limited = await rateLimit('landlordCode', getClientIp(req))
  if (limited) return limited

  const expected = process.env.LANDLORD_INVITE_CODE

  if (!expected) {
    console.error('LANDLORD_INVITE_CODE env var not set')
    return NextResponse.json({ valid: false, error: 'Server misconfigured' }, { status: 500 })
  }

  let submitted: string | undefined
  try {
    const body = await req.json()
    submitted = typeof body?.code === 'string' ? body.code : undefined
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  if (!submitted) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  // H1: previously used `===` which short-circuits on the first mismatching
  // byte and leaks length-then-bytes via timing. Use crypto.timingSafeEqual
  // on equal-length buffers; for mismatched lengths, return invalid without
  // revealing length via timing (compare a dummy buffer of equal length to
  // the expected so the hash work is constant).
  const a = Buffer.from(submitted.trim(), 'utf8')
  const b = Buffer.from(expected.trim(), 'utf8')
  let valid = false
  if (a.length === b.length) {
    valid = crypto.timingSafeEqual(a, b)
  } else {
    // Burn equivalent CPU work so length mismatch isn't observable from
    // response timing alone. Compare b against itself (always true) but
    // don't propagate that result.
    crypto.timingSafeEqual(b, b)
    valid = false
  }

  return NextResponse.json({ valid })
}
