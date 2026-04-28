// app/api/quickbooks/callback/route.js

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const realmId = searchParams.get('realmId')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.rentidge.com'

  if (error) {
    return Response.redirect(`${appUrl}/dashboard?qb_error=${error}`)
  }

  if (!code || !realmId || !state) {
    return Response.redirect(`${appUrl}/dashboard?qb_error=missing_params`)
  }

  // Decode landlordId from state
  let landlordId
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'))
    landlordId = decoded.landlordId
  } catch {
    return Response.redirect(`${appUrl}/dashboard?qb_error=invalid_state`)
  }

  if (!landlordId) {
    return Response.redirect(`${appUrl}/dashboard?qb_error=missing_landlord`)
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
      console.error('Token exchange failed:', tokenData)
      return Response.redirect(`${appUrl}/dashboard?qb_error=token_exchange_failed`)
    }

    // Store tokens per landlord
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
      console.error('Error storing QB tokens:', dbError)
      return Response.redirect(`${appUrl}/dashboard?qb_error=db_error`)
    }

    return Response.redirect(`${appUrl}/dashboard?qb_connected=true`)
  } catch (err) {
    console.error('QuickBooks callback error:', err)
    return Response.redirect(`${appUrl}/dashboard?qb_error=server_error`)
  }
}
