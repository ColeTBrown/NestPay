// app/api/quickbooks/sync/route.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const QB_BASE_URL =
  process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken, realmId) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(tokenData)}`);
  }

  // Update tokens in Supabase
  await supabase
    .from('quickbooks_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      updated_at: new Date().toISOString(),
    })
    .eq('realm_id', realmId);

  return tokenData.access_token;
}

// Get valid access token (refresh if needed)
async function getValidAccessToken() {
  const { data: tokenRow, error } = await supabase
    .from('quickbooks_tokens')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !tokenRow) {
    throw new Error('No QuickBooks tokens found. Please connect QuickBooks first.');
  }

  // Check if token is expired (expires_in is in seconds)
  const tokenAge = (Date.now() - new Date(tokenRow.updated_at).getTime()) / 1000;
  if (tokenAge >= tokenRow.expires_in - 60) {
    // Refresh 60 seconds before expiry
    const newToken = await refreshAccessToken(tokenRow.refresh_token, tokenRow.realm_id);
    return { accessToken: newToken, realmId: tokenRow.realm_id };
  }

  return { accessToken: tokenRow.access_token, realmId: tokenRow.realm_id };
}

// Create an income (sales receipt) entry in QuickBooks
async function createSalesReceipt({ accessToken, realmId, amount, tenantName, unitName, paymentDate, stripePaymentId }) {
  const salesReceipt = {
    Line: [
      {
        Amount: amount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1', // Default income item — can be customized
            name: 'Services',
          },
          Qty: 1,
          UnitPrice: amount,
        },
        Description: `Rent payment - ${unitName} - ${tenantName}`,
      },
    ],
    CustomerRef: {
      name: tenantName,
    },
    TxnDate: paymentDate,
    PrivateNote: `Stripe Payment ID: ${stripePaymentId}`,
    PaymentMethodRef: {
      value: '1',
    },
  };

  const response = await fetch(
    `${QB_BASE_URL}/v3/company/${realmId}/salesreceipt`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(salesReceipt),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`QuickBooks API error: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, tenantName, unitName, paymentDate, stripePaymentId } = body;

    if (!amount || !tenantName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { accessToken, realmId } = await getValidAccessToken();

    const receipt = await createSalesReceipt({
      accessToken,
      realmId,
      amount: amount / 100, // Convert from cents to dollars
      tenantName,
      unitName: unitName || 'Rental Unit',
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      stripePaymentId,
    });

    return Response.json({ success: true, receipt });
  } catch (err) {
    console.error('QuickBooks sync error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
