// app/api/quickbooks/auth/route.js

export async function GET(request) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
  const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';

  const scope = 'com.intuit.quickbooks.accounting';
  const state = Math.random().toString(36).substring(7);

  const authBaseUrl =
    environment === 'sandbox'
      ? 'https://appcenter.intuit.com/connect/oauth2'
      : 'https://appcenter.intuit.com/connect/oauth2';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    state: state,
  });

  const authUrl = `${authBaseUrl}?${params.toString()}`;

  return Response.redirect(authUrl);
}
