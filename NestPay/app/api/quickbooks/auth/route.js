// app/api/quickbooks/auth/route.js

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const landlordId = searchParams.get('landlordId')

  if (!landlordId) {
    return Response.json({ error: 'Missing landlordId' }, { status: 400 })
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI
  const scope = 'com.intuit.quickbooks.accounting'

  // Encode landlordId in state so we get it back in the callback
  const state = Buffer.from(JSON.stringify({ landlordId })).toString('base64')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    state: state,
  })

  const authUrl = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`

  return Response.redirect(authUrl)
}
