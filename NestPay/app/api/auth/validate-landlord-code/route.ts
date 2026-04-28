import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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

  const valid = submitted.trim() === expected.trim()
  return NextResponse.json({ valid })
}
