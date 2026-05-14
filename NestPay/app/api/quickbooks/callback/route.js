// app/api/quickbooks/callback/route.js
//
// C5: previously decoded landlordId from a base64-but-unsigned `state`
// parameter, so an attacker could substitute any landlordId into the state
// and complete the OAuth flow with their OWN Intuit account, attaching it
// to the victim's landlord profile (or vice versa).
//
// This handler now:
//   1. Requires an authenticated landlord session — derives landlordId from
//      session.user.id, ignores anything in `state` or query params for
//      identity purposes.
//   2. Validates the `state` parameter against an oauth_states row that was
//      minted in /api/quickbooks/auth: must exist, be owned by the current
//      user, not expired, not already used. Marks used on success.
//   3. Heads-up: if the user's session expired between /auth and /callback,
//      this returns an error and they have to re-login + restart the OAuth
//      flow. Acceptable UX trade-off (audit notes: PR #1 OAuth UX call).

import { createClient } from '@supabase/supabase-js'
import { requireLandlord } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function GET(request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.rentidge.com'
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const realmId = searchParams.get('realmId')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return Response.redirect(`${appUrl}/dashboard?qb_error=${error}`)
  }

  if (!code || !realmId || !state) {
    return Response.redirect(`${appUrl}/dashboard?qb_error=missing_params`)
  }

  // Require the landlord to still be logged in.
  const auth = await requireLandlord()
  if ('response' in auth) {
    return Response.redirect(`${appUrl}/dashboard?qb_error=session_expired`)
  }
  const landlordId = auth.landlordId

  // Validate state nonce: must exist, be owned by this user, not expired,
  // not already used. Atomically mark used by gating on used_at IS NULL.
  const { data: stateRow, error: stateLookupErr } = await supabase
    .from('oauth_states')
    .select('id, user_id, expires_at, used_at')
    .eq('nonce', state)
    .eq('provider', 'quickbooks')
    .single()

  if (stateLookupErr || !stateRow) {
    console.error('[quickbooks/callback] unknown state nonce:', stateLookupErr)
    return Response.redirect(`${appUrl}/dashboard?qb_error=invalid_state`)
  }
  if (stateRow.user_id !== landlordId) {
    console.error('[quickbooks/callback] state user mismatch')
    return Response.redirect(`${appUrl}/dashboard?qb_error=invalid_state`)
  }
  if (stateRow.used_at) {
    console.error('[quickbooks/callback] state replay attempt')
    return Response.redirect(`${appUrl}/dashboard?qb_error=invalid_state`)
  }
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    return Response.redirect(`${appUrl}/dashboard?qb_error=state_expired`)
  }

  const { error: markUsedErr, count } = await supabase
    .from('oauth_states')
    .update({ used_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', stateRow.id)
    .is('used_at', null)
    .select('id', { count: 'exact', head: true })

  if (markUsedErr || count !== 1) {
    // Race: someone else (or a retry) consumed the nonce between our SELECT
    // and UPDATE. Reject.
    console.error('[quickbooks/callback] race on state mark-used:', markUsedErr)
    return Response.redirect(`${appUrl}/dashboard?qb_error=invalid_state`)
  }

  try {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('[quickbooks/callback] token exchange failed:', tokenData)
      return Response.redirect(`${appUrl}/dashboard?qb_error=token_exchange_failed`)
    }

    // Store tokens for THIS landlord (derived from session, never query).
    const { error: dbError } = await supabase
      .from('quickbooks_tokens')
      .upsert({
        landlord_id: landlordId,
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'landlord_id' })

    if (dbError) {
      console.error('[quickbooks/callback] error storing QB tokens:', dbError)
      return Response.redirect(`${appUrl}/dashboard?qb_error=db_error`)
    }

    return Response.redirect(`${appUrl}/dashboard?qb_connected=true`)
  } catch (err) {
    console.error('[quickbooks/callback] error:', err)
    return Response.redirect(`${appUrl}/dashboard?qb_error=server_error`)
  }
}
