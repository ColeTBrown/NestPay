import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { tenantId, paymentMonth, saveCard } = await req.json()

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*, units(monthly_rent)')
      .eq('id', tenantId)
      .single()

    if (error || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const amountCents = Math.round(tenant.units.monthly_rent * 100)

    let customerId = tenant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.full_name,
        metadata: { tenantId, unitId: tenant.unit_id },
      })
      customerId = customer.id
      await supabaseAdmin.from('tenants').update({ stripe_customer_id: customerId }).eq('id', tenantId)
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      setup_future_usage: saveCard ? 'off_session' : undefined,
      metadata: { tenantId, unitId: tenant.unit_id, paymentMonth },
      description: `NestPay rent — ${paymentMonth}`,
    })

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