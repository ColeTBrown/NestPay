import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.rentidge.com'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const landlordId = searchParams.get('landlordId')

  if (!landlordId) {
    return NextResponse.redirect(`${APP_URL}/dashboard?stripe_error=missing_landlord`)
  }

  try {
    // Check if landlord already has a Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', landlordId)
      .single()

    if (profileError) {
      console.error('Profile lookup error:', profileError)
      return NextResponse.redirect(`${APP_URL}/dashboard?stripe_error=profile_not_found`)
    }

    let accountId: string | null = profile?.stripe_account_id ?? null

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
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', landlordId)

      if (updateError) {
        console.error('Failed to save stripe_account_id:', updateError)
        return NextResponse.redirect(`${APP_URL}/dashboard?stripe_error=save_failed`)
      }
    }

    // Create an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/api/stripe/connect?landlordId=${landlordId}`,
      return_url: `${APP_URL}/dashboard?stripe=connected`,
      type: 'account_onboarding',
    })

    return NextResponse.redirect(accountLink.url)
  } catch (err) {
    console.error('Stripe Connect error:', err)
    return NextResponse.redirect(`${APP_URL}/dashboard?stripe_error=server_error`)
  }
}
