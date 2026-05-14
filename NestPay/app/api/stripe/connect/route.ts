import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireLandlord } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.rentidge.com'

export async function GET() {
  // C4: previously took landlordId from a query string and would create a
  // Stripe Express account in any landlord's name (writing stripe_account_id
  // back into their profiles row via the service role). Now we derive
  // landlordId from a verified landlord session.
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response
  const landlordId = auth.landlordId

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', landlordId)
      .single()

    if (profileError) {
      console.error('[stripe/connect] profile lookup error:', profileError)
      return NextResponse.redirect(`${APP_URL}/dashboard?stripe_error=profile_not_found`)
    }

    let accountId: string | null = profile?.stripe_account_id ?? null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', landlordId)

      if (updateError) {
        console.error('[stripe/connect] failed to save stripe_account_id:', updateError)
        return NextResponse.redirect(`${APP_URL}/dashboard?stripe_error=save_failed`)
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      // refresh_url no longer needs landlordId — the route derives it from session.
      refresh_url: `${APP_URL}/api/stripe/connect`,
      return_url: `${APP_URL}/dashboard?stripe=connected`,
      type: 'account_onboarding',
    })

    return NextResponse.redirect(accountLink.url)
  } catch (err) {
    console.error('[stripe/connect] error:', err)
    return NextResponse.redirect(`${APP_URL}/dashboard?stripe_error=server_error`)
  }
}
