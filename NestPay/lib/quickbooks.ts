import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'

// QuickBooks Online sync helpers, lifted out of /api/quickbooks/sync so the
// Stripe webhook can call them directly instead of fanning out via HTTP.
// (See PR #1: removing the public /api/quickbooks/sync endpoint that allowed
// anyone to inject fake income entries into any landlord's QB.)

const QB_BASE_URL =
  process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com'

async function refreshAccessToken(refreshToken: string, landlordId: string) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

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
  })

  const tokenData = await response.json()
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(tokenData)}`)
  }
  await supabaseAdmin
    .from('quickbooks_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      updated_at: new Date().toISOString(),
    })
    .eq('landlord_id', landlordId)
  return tokenData.access_token
}

async function getValidAccessToken(landlordId: string) {
  const { data: tokenRow, error } = await supabaseAdmin
    .from('quickbooks_tokens')
    .select('*')
    .eq('landlord_id', landlordId)
    .single()
  if (error || !tokenRow) {
    throw new Error('No QuickBooks tokens found for this landlord. Please connect QuickBooks first.')
  }
  const tokenAge = (Date.now() - new Date(tokenRow.updated_at).getTime()) / 1000
  if (tokenAge >= tokenRow.expires_in - 60) {
    const newToken = await refreshAccessToken(tokenRow.refresh_token, landlordId)
    return { accessToken: newToken, realmId: tokenRow.realm_id }
  }
  return { accessToken: tokenRow.access_token, realmId: tokenRow.realm_id }
}

export type RentReceipt = {
  /** dollars (not cents) */
  amount: number
  tenantName: string
  unitName: string
  /** ISO date YYYY-MM-DD */
  paymentDate: string
  stripePaymentId: string
}

export async function syncRentToQuickBooks(landlordId: string, receipt: RentReceipt) {
  const { accessToken, realmId } = await getValidAccessToken(landlordId)

  const salesReceipt = {
    Line: [
      {
        Amount: receipt.amount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: '1', name: 'Services' },
          Qty: 1,
          UnitPrice: receipt.amount,
        },
        Description: `Rent payment - ${receipt.unitName} - ${receipt.tenantName}`,
      },
    ],
    CustomerRef: { name: receipt.tenantName },
    TxnDate: receipt.paymentDate,
    PrivateNote: `Stripe Payment ID: ${receipt.stripePaymentId}`,
    PaymentMethodRef: { value: '1' },
  }

  const response = await fetch(`${QB_BASE_URL}/v3/company/${realmId}/salesreceipt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(salesReceipt),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`QuickBooks API error: ${JSON.stringify(data)}`)
  }
  return data
}
