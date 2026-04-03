import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

const PLATFORM_FEE_PERCENT = 0.08 // 8%

export async function POST(req: NextRequest) {
  try {
    const { tenantId, paymentMonth, saveCard } = await req.json()

    // Get tenant with unit, property, and landlord profile
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select(`
        *,
        units (
          monthly_rent,
          properties (
            landlord_id,
            name
          )
        )
      `)
      .eq('id', tenantId)
      .single()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const landlordId = tenant.units?.properties?.landlord_id

    if (!landlordId) {
      return NextResponse.json({ error: 'Landlord not found for this unit' }, { status: 404 })
    }

    // Get landlord's Stripe Connect account
    const { data: landlordProfile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', landlordId)
      .single()

    if (!landlordProfile?.stripe_account_id || !landlordProfile?.stripe_onboarding_complete) {
      return NextResponse.json({ error: 'Landlord has not connected their Stripe account yet' }, { status: 400 })
    }

    const stripeAccountId = landlordProfile.stripe_account_id
    const amountCents = Math.round(tenant.units.monthly_rent * 100)
    const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT)

    // Create or retrieve Stripe customer
    let customerId = tenant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.full_name,
        metadata: { tenantId, unitId: tenant.unit_id },
      })
      customerId = customer.id
      await supabaseAdmin
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenantId)
    }

    // Create payment intent routed to landlord's Stripe account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      setup_future_usage: saveCard ? 'off_session' : undefined,
      metadata: { tenantId, unitId: tenant.unit_id, paymentMonth },
      description: `NestBridge rent — ${paymentMonth} — ${tenant.units?.properties?.name || ''}`,
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: stripeAccountId,
      },
    })

    // Record payment in Supabase
    await supabaseAdmin.from('payments').insert({
      tenant_id: tenantId,
      unit_id: tenant.unit_id,
      amount: tenant.units.monthly_rent,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
      payment_month: paymentMonth,
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
