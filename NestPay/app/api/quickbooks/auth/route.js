// app/api/quickbooks/auth/route.js
//
// C4: previously took landlordId from a query string and would mint an OAuth
// flow for any landlord. Anyone could spam-initiate Intuit OAuth on behalf of
// any landlord and (combined with the unauthenticated callback) attach their
// own QuickBooks account to a victim's profile. Now this route requires a
// landlord session and mints a single-use, user-bound, 10-minute TTL state
// nonce stored in oauth_states.

import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireLandlord } from '@/lib/auth'

export async function GET() {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response

  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI
  if (!clientId || !redirectUri) {
    console.error('[quickbooks/auth] QUICKBOOKS_CLIENT_ID / QUICKBOOKS_REDIRECT_URI not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const nonce = crypto.randomBytes(32).toString('hex')
  const { error } = await supabaseAdmin.from('oauth_states').insert({
    user_id: auth.landlordId,
    nonce,
    provider: 'quickbooks',
  })
  if (error) {
    console.error('[quickbooks/auth] failed to mint oauth state:', error)
    return NextResponse.json({ error: 'Could not start OAuth flow' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state: nonce,
  })

  return NextResponse.redirect(`https://appcenter.intuit.com/connect/oauth2?${params.toString()}`)
}
