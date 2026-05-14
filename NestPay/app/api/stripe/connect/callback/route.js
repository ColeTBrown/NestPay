// app/api/stripe/connect/callback/route.js
//
// C4: this endpoint is called by the dashboard after Stripe redirects the
// landlord back from hosted onboarding. Previously it took landlordId from a
// query string with no auth, so anyone could trigger a status sync that
// updated stripe_onboarding_complete on any landlord's profile (and read
// stripe_account_id back). Now we derive landlordId from session.
//
// Note: we do NOT need a state nonce here because Stripe Connect's flow
// doesn't carry our own state — this is a status-check polled by our own
// dashboard, not an OAuth callback handled by an external party.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireLandlord } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.rentidge.com'

export async function GET() {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response
  const landlordId = auth.landlordId

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', landlordId)
      .single()

    if (!profile?.stripe_account_id) {
      return Response.redirect(`${APP_URL}/dashboard?stripe_error=no_account`)
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id)
    const onboardingComplete = account.details_submitted

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
    console.error('[stripe/connect/callback] error:', err)
    return Response.redirect(`${APP_URL}/dashboard?stripe_error=server_error`)
  }
}
