import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { syncRentToQuickBooks } from '@/lib/quickbooks'

// Stripe webhook receiver. Authentication is the Stripe signature
// (constructEvent below) — uses crypto.timingSafeEqual internally with a
// 5-minute replay tolerance. No session check (Stripe has no cookie).
//
// C1: this handler used to fan out to a separate /api/quickbooks/sync
// route via fetch(). That route was unauthenticated and let anyone inject
// fake income entries into any landlord's QB. The route is gone — QB sync
// is now done inline below by calling syncRentToQuickBooks() directly.
// Failures are recorded in the sync_failures table so they don't get lost
// in console.error noise.

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  // Handle landlord Stripe Connect onboarding completion
  if (event.type === 'account.updated') {
    const account = event.data.object as any

    const onboardingComplete =
      account.charges_enabled === true &&
      account.details_submitted === true

    if (onboardingComplete) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('stripe_account_id', account.id)

      if (error) {
        console.error('Failed to update stripe_onboarding_complete:', error)
      } else {
        console.log('Marked landlord onboarding complete:', account.id)
      }
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as any

    // Update payment status in Supabase
    await supabaseAdmin
      .from('payments')
      .update({ status: 'succeeded', paid_at: new Date().toISOString() })
      .eq('stripe_payment_intent_id', pi.id)

    // Save payment method if autopay was enabled
    if (pi.payment_method && pi.setup_future_usage) {
      await supabaseAdmin
        .from('tenants')
        .update({ stripe_payment_method_id: pi.payment_method, autopay_enabled: true })
        .eq('id', pi.metadata.tenantId)
    }

    // Move-in payment: the charge is 2× monthly_rent + optionally the
    // security deposit (if landlord uses 'bundled' mode and the unit has
    // a deposit). Both flags get flipped here based on metadata.
    if (pi.metadata?.paymentType === 'move_in' && pi.metadata?.tenantId) {
      const includesDeposit = pi.metadata?.includesDeposit === '1'
      const depositAmount = Number(pi.metadata?.depositAmount ?? 0)
      const totalCharged = pi.amount / 100
      const rentPortion = totalCharged - (includesDeposit ? depositAmount : 0)
      // Held last-month is half the rent portion (rent portion is 2× monthly).
      const heldLastMonth = rentPortion / 2

      const update: Record<string, unknown> = {
        move_in_paid: true,
        last_month_held_amount: heldLastMonth,
      }
      if (includesDeposit && depositAmount > 0) {
        update.security_deposit_paid = true
        update.security_deposit_held_amount = depositAmount
      }
      const { error: moveInErr } = await supabaseAdmin
        .from('tenants')
        .update(update)
        .eq('id', pi.metadata.tenantId)
      if (moveInErr) {
        console.error('[stripe/webhook] failed to mark move_in_paid:', moveInErr)
      }
    }

    // Standalone security deposit payment (separate mode, or no last-month
    // requirement).
    if (pi.metadata?.paymentType === 'security_deposit' && pi.metadata?.tenantId) {
      const depositAmount = Number(pi.metadata?.depositAmount ?? pi.amount / 100)
      const { error: depositErr } = await supabaseAdmin
        .from('tenants')
        .update({
          security_deposit_paid: true,
          security_deposit_held_amount: depositAmount,
        })
        .eq('id', pi.metadata.tenantId)
      if (depositErr) {
        console.error('[stripe/webhook] failed to mark security_deposit_paid:', depositErr)
      }
    }

    // Sync to QuickBooks inline (replaces the prior public /api/quickbooks/sync
    // HTTP fan-out — see C1 comment at the top of this file).
    let paymentRowId: string | null = null
    let landlordIdForFailure: string | null = null
    try {
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select(`
          id,
          tenants (
            full_name,
            units (
              unit_number,
              properties (name, landlord_id)
            )
          )
        `)
        .eq('stripe_payment_intent_id', pi.id)
        .single()

      if (payment) {
        paymentRowId = (payment as any).id
        const tenantName = (payment as any).tenants?.full_name || 'Unknown Tenant'
        const unitNumberRaw = (payment as any).tenants?.units?.unit_number
        const propertyName = (payment as any).tenants?.units?.properties?.name || ''
        const unitName = unitNumberRaw
          ? `Unit ${unitNumberRaw} - ${propertyName}`
          : 'Rental Unit'
        const landlordId = (payment as any).tenants?.units?.properties?.landlord_id
        landlordIdForFailure = landlordId ?? null

        if (!landlordId) {
          throw new Error('Could not resolve landlord_id for QB sync')
        }

        await syncRentToQuickBooks(landlordId, {
          // syncRentToQuickBooks expects dollars, not cents
          amount: pi.amount / 100,
          tenantName,
          unitName,
          paymentDate: new Date(pi.created * 1000).toISOString().split('T')[0],
          stripePaymentId: pi.id,
        })
        console.log('QuickBooks sync successful for payment:', pi.id)
      }
    } catch (qbErr: any) {
      // Surface the failure: console + sync_failures table. We don't throw
      // because returning non-2xx would tell Stripe to retry the webhook,
      // which could double-update our payments row. Better to ack the
      // payment and surface the QB drift for follow-up.
      console.error('[stripe/webhook] QuickBooks sync failed:', qbErr)
      try {
        await supabaseAdmin.from('sync_failures').insert({
          service: 'quickbooks',
          payment_id: paymentRowId,
          stripe_payment_intent_id: pi.id,
          landlord_id: landlordIdForFailure,
          error_message: String(qbErr?.message ?? qbErr),
        })
      } catch (insertErr) {
        console.error('[stripe/webhook] failed to record sync_failure:', insertErr)
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any
    await supabaseAdmin
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', pi.id)
  }

  return NextResponse.json({ received: true })
}
