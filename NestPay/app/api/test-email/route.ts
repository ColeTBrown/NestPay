import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

// Quick-and-dirty endpoint to confirm Resend is wired up correctly.
//
// Usage:
//   GET /api/test-email?to=you@example.com&token=$EMAIL_TEST_TOKEN
//
// Set EMAIL_TEST_TOKEN in env to gate the endpoint. If it's unset the route
// 503s — that way we don't accidentally ship a public email-sending endpoint.
export async function GET(req: NextRequest) {
  const expected = process.env.EMAIL_TEST_TOKEN
  if (!expected) {
    return NextResponse.json(
      { error: 'EMAIL_TEST_TOKEN not configured' },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const to = searchParams.get('to')

  if (token !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!to) {
    return NextResponse.json({ error: 'Missing ?to=' }, { status: 400 })
  }

  try {
    const result = await sendEmail({
      to,
      subject: 'Rentidge — test email',
      html: `<p>Hello from Rentidge!</p><p>This is a test email confirming Resend is configured. Sent at ${new Date().toISOString()}.</p>`,
      text: `Hello from Rentidge!\nResend is configured. Sent at ${new Date().toISOString()}.`,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    console.error('test-email error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
