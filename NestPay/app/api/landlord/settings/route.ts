import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireLandlord } from '@/lib/auth'

// Landlord settings (currently just require_last_month_rent — designed to
// grow). GET returns the caller's own row; POST updates a whitelisted set
// of fields. landlordId always comes from the verified session, never the
// request body, so this can't be used to mutate another landlord's row.

const DEPOSIT_MODES = ['bundled', 'separate'] as const
type DepositMode = (typeof DEPOSIT_MODES)[number]

export async function GET() {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('require_last_month_rent, deposit_collection_mode')
    .eq('id', auth.landlordId)
    .single()

  if (error) {
    console.error('[landlord/settings] GET error:', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }

  return NextResponse.json({
    require_last_month_rent: data?.require_last_month_rent ?? false,
    deposit_collection_mode: data?.deposit_collection_mode ?? 'bundled',
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.require_last_month_rent === 'boolean') {
    update.require_last_month_rent = body.require_last_month_rent
  }
  if (typeof body.deposit_collection_mode === 'string' &&
      (DEPOSIT_MODES as readonly string[]).includes(body.deposit_collection_mode)) {
    update.deposit_collection_mode = body.deposit_collection_mode as DepositMode
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(update)
    .eq('id', auth.landlordId)

  if (error) {
    console.error('[landlord/settings] POST error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
