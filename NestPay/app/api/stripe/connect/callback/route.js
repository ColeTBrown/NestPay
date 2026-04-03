// app/api/stripe/connect/callback/route.js

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
    return Response.redirect(`${APP_URL}/dashboard?stripe_error=missing_landlord`)
  }

  try {
    // Get the landlord's Stripe account ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', landlordId)
      .single()

    if (!profile?.stripe_account_id) {
      return Response.redirect(`${APP_URL}/dashboard?stripe_error=no_account`)
    }

    // Verify the account is fully onboarded
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)
    const onboardingComplete = account.details_submitted

    // Update onboarding status in Supabase
    await supabase
      .from('profiles')
      .update({ stripe_onboarding_complete: onboardingComplete })
      .eq('id', landlordId)

    if (onboardingComplete) {
      return Response.redirect(`${APP_URL}/dashboard?stripe_connected=true`)
    } else {
      return Response.redirect(`${APP_URL}/dashboard?stripe_error=incomplete`)
    }
  } catch (err) {
    console.error('Stripe Connect callback error:', err)
    return Response.redirect(`${APP_URL}/dashboard?stripe_error=server_error`)
  }
}
