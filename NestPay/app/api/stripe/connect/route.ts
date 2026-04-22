// app/api/stripe/connect/route.js

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://nest-pay-theta.vercel.app'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const landlordId = searchParams.get('landlordId')

  if (!landlordId) {
    return Response.json({ error: 'Missing landlordId' }, { status: 400 })
  }

  try {
    // Check if landlord already has a Stripe account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', landlordId)
      .single()

    let accountId = profile?.stripe_account_id

    // Create a new Stripe Express account if they don't have one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      accountId = account.id

      // Save the account ID to Supabase
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', landlordId)
    }

    // Create an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/api/stripe/connect?landlordId=${landlordId}`,
      return_url: `${APP_URL}/api/stripe/connect/callback?landlordId=${landlordId}`,
      type: 'account_onboarding',
    })

    return Response.redirect(accountLink.url)
  } catch (err) {
    console.error('Stripe Connect error:', err)
    return Response.redirect(`${APP_URL}/dashboard?stripe_error=server_error`)
  }
}
