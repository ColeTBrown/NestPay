import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireLandlord } from '@/lib/auth'
import { pingSignwell } from '@/lib/esign/signwell'

// E-sign provider connection management for landlords (BYO model).
//
// Endpoints:
//   GET  — returns current connection status (connected? when? webhook URL)
//   POST — saves credentials; validates them with a live API call first
//   DELETE — disconnects (clears credentials)
//
// The webhook URL returned by GET is the per-landlord URL the landlord
// must paste into SignWell's "Event Callback URL" field for their API
// app. We construct it from the request origin so it works in both
// preview and production deployments.

export async function GET(req: NextRequest) {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('signwell_api_key, signwell_api_app_id, signwell_connected_at')
    .eq('id', auth.landlordId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const connected = !!(data?.signwell_api_key && data?.signwell_api_app_id)
  const origin = req.headers.get('origin') ?? `https://${req.headers.get('host') ?? ''}`

  return NextResponse.json({
    connected,
    connectedAt: data?.signwell_connected_at ?? null,
    // Never leak the key/appId back to the browser, just whether they exist.
    hasApiKey: !!data?.signwell_api_key,
    hasApiAppId: !!data?.signwell_api_app_id,
    webhookUrl: `${origin}/api/sign-webhook/${auth.landlordId}`,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => null)
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
  const apiAppId = typeof body?.apiAppId === 'string' ? body.apiAppId.trim() : ''
  if (!apiKey || !apiAppId) {
    return NextResponse.json({ error: 'apiKey and apiAppId are required' }, { status: 400 })
  }

  // Validate the credentials by hitting SignWell's /me endpoint. If
  // they're invalid we catch it now instead of letting the first real
  // signature request fail mysteriously.
  const ping = await pingSignwell({ apiKey, apiAppId })
  if (!ping.ok) {
    const msg = 'error' in ping ? ping.error : 'invalid credentials'
    return NextResponse.json({ error: `Could not connect to SignWell: ${msg}` }, { status: 400 })
  }
  const accountEmail = 'email' in ping ? ping.email : ''

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      signwell_api_key: apiKey,
      signwell_api_app_id: apiAppId,
      signwell_connected_at: new Date().toISOString(),
    })
    .eq('id', auth.landlordId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const origin = req.headers.get('origin') ?? `https://${req.headers.get('host') ?? ''}`
  return NextResponse.json({
    ok: true,
    accountEmail,
    webhookUrl: `${origin}/api/sign-webhook/${auth.landlordId}`,
  })
}

export async function DELETE() {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      signwell_api_key: null,
      signwell_api_app_id: null,
      signwell_connected_at: null,
    })
    .eq('id', auth.landlordId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
