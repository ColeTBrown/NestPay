import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTenant } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'

const PLATFORM_FEE_PERCENT = 0.08 // 8%

type PaymentType = 'monthly' | 'move_in' | 'security_deposit'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenant()
    if ('response' in auth) return auth.response
    const tenantId = auth.tenantId

    const limited = await rateLimit('payment', auth.userId)
    if (limited) return limited

    const body = await req.json()
    const paymentType: PaymentType =
      body?.paymentType === 'move_in' ? 'move_in'
      : body?.paymentType === 'security_deposit' ? 'security_deposit'
      : 'monthly'
    const { paymentMonth, saveCard } = body
    if (paymentType === 'monthly' && (typeof paymentMonth !== 'string' || !paymentMonth)) {
      return NextResponse.json({ error: 'Missing paymentMonth' }, { status: 400 })
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select(`
        *,
        units (
          monthly_rent,
          security_deposit_amount,
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

    const { data: landlordProfile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete, require_last_month_rent, deposit_collection_mode')
      .eq('id', landlordId)
      .single()

    if (!landlordProfile?.stripe_account_id || !landlordProfile?.stripe_onboarding_complete) {
      return NextResponse.json({ error: 'Landlord has not connected their Stripe account yet' }, { status: 400 })
    }

    const monthlyRent = Number(tenant.units.monthly_rent)
    const depositAmount = Number(tenant.units.security_deposit_amount ?? 0)
    const requireLastMonth = landlordProfile.require_last_month_rent === true
    const depositMode: 'bundled' | 'separate' =
      landlordProfile.deposit_collection_mode === 'separate' ? 'separate' : 'bundled'
    const stripeAccountId = landlordProfile.stripe_account_id

    // ---------- move-in branch ----------
    // Charges 2× monthly_rent, optionally plus the security deposit if the
    // landlord uses bundled mode and the deposit hasn't already been paid.
    // The webhook reads metadata to know which tenant flags to flip.
    if (paymentType === 'move_in') {
      if (!requireLastMonth) {
        return NextResponse.json({ error: 'Move-in payment not required for this landlord' }, { status: 400 })
      }
      if (tenant.move_in_paid) {
        return NextResponse.json({ error: 'Move-in already paid' }, { status: 409 })
      }

      const includeDeposit =
        depositMode === 'bundled' && depositAmount > 0 && !tenant.security_deposit_paid

      const rentPortion = monthlyRent * 2
      const totalAmount = rentPortion + (includeDeposit ? depositAmount : 0)
      const amountCents = Math.round(totalAmount * 100)
      const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT)

      const customerId = await ensureStripeCustomer(tenant, tenantId)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: customerId,
        setup_future_usage: saveCard ? 'off_session' : undefined,
        metadata: {
          tenantId,
          unitId: tenant.unit_id,
          paymentType: 'move_in',
          // Webhook uses this to know whether to flip security_deposit_paid too.
          includesDeposit: includeDeposit ? '1' : '0',
          depositAmount: includeDeposit ? String(depositAmount) : '0',
        },
        description: includeDeposit
          ? `Rentidge move-in (first + last + deposit) — ${tenant.units?.properties?.name || ''}`
          : `Rentidge move-in (first + last) — ${tenant.units?.properties?.name || ''}`,
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: stripeAccountId },
      })

      await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        unit_id: tenant.unit_id,
        amount: totalAmount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        payment_month: new Date().toISOString().slice(0, 7),
        category: 'move_in',
      })

      return NextResponse.json({ clientSecret: paymentIntent.client_secret })
    }

    // ---------- security deposit branch ----------
    // Standalone deposit charge. Used when:
    //   - landlord uses 'separate' mode, OR
    //   - landlord doesn't require last-month rent at all (no move-in flow
    //     to bundle into), but the unit does have a deposit set.
    if (paymentType === 'security_deposit') {
      if (depositAmount <= 0) {
        return NextResponse.json({ error: 'No deposit required for this unit' }, { status: 400 })
      }
      if (tenant.security_deposit_paid) {
        return NextResponse.json({ error: 'Deposit already paid' }, { status: 409 })
      }

      const amountCents = Math.round(depositAmount * 100)
      const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT)
      const customerId = await ensureStripeCustomer(tenant, tenantId)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: customerId,
        setup_future_usage: saveCard ? 'off_session' : undefined,
        metadata: {
          tenantId,
          unitId: tenant.unit_id,
          paymentType: 'security_deposit',
          depositAmount: String(depositAmount),
        },
        description: `Rentidge security deposit — ${tenant.units?.properties?.name || ''}`,
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: stripeAccountId },
      })

      await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        unit_id: tenant.unit_id,
        amount: depositAmount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        payment_month: new Date().toISOString().slice(0, 7),
        category: 'security_deposit',
      })

      return NextResponse.json({ clientSecret: paymentIntent.client_secret })
    }

    // ---------- monthly branch ----------

    if (requireLastMonth && !tenant.move_in_paid) {
      return NextResponse.json(
        { error: 'Move-in payment required before monthly rent', code: 'move_in_required' },
        { status: 409 },
      )
    }

    // Auto-credit the held last month when the tenant is paying their final
    // lease month. We use the tenant's lease_end (YYYY-MM-DD) -> YYYY-MM to
    // compare. If lease_end is null we skip the credit logic (no lease end
    // recorded = treat as ongoing tenancy).
    const heldAmount = Number(tenant.last_month_held_amount) || 0
    const leaseEndMonth = tenant.lease_end ? String(tenant.lease_end).slice(0, 7) : null
    const isFinalLeaseMonth = leaseEndMonth !== null && leaseEndMonth === paymentMonth

    if (isFinalLeaseMonth && heldAmount > 0) {
      await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        unit_id: tenant.unit_id,
        amount: heldAmount,
        stripe_payment_intent_id: null,
        status: 'succeeded',
        payment_month: paymentMonth,
        paid_at: new Date().toISOString(),
        category: 'last_month_credit',
      })
      await supabaseAdmin
        .from('tenants')
        .update({ last_month_held_amount: 0 })
        .eq('id', tenantId)

      return NextResponse.json({
        coveredByHeldDeposit: true,
        amount: heldAmount,
      })
    }

    const amountCents = Math.round(monthlyRent * 100)
    const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT)
    const customerId = await ensureStripeCustomer(tenant, tenantId)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      setup_future_usage: saveCard ? 'off_session' : undefined,
      metadata: { tenantId, unitId: tenant.unit_id, paymentMonth, paymentType: 'monthly' },
      description: `Rentidge rent — ${paymentMonth} — ${tenant.units?.properties?.name || ''}`,
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: stripeAccountId },
    })

    await supabaseAdmin.from('payments').insert({
      tenant_id: tenantId,
      unit_id: tenant.unit_id,
      amount: monthlyRent,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
      payment_month: paymentMonth,
      category: 'monthly_rent',
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    console.error('[create-payment-intent] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function ensureStripeCustomer(tenant: any, tenantId: string): Promise<string> {
  if (tenant.stripe_customer_id) return tenant.stripe_customer_id

  const customer = await stripe.customers.create({
    email: tenant.email,
    name: tenant.full_name,
    metadata: { tenantId, unitId: tenant.unit_id },
  })
  await supabaseAdmin
    .from('tenants')
    .update({ stripe_customer_id: customer.id })
    .eq('id', tenantId)
  return customer.id
}
