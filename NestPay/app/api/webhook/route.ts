import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
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

    // Sync to QuickBooks
    try {
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select(`
          *,
          tenants (
            name,
            units (
              unit_number,
              properties (name)
            )
          )
        `)
        .eq('stripe_payment_intent_id', pi.id)
        .single()

      if (payment) {
        const tenantName = payment.tenants?.name || 'Unknown Tenant'
        const unitName = payment.tenants?.units?.unit_number
          ? `Unit ${payment.tenants.units.unit_number} - ${payment.tenants.units.properties?.name || ''}`
          : 'Rental Unit'

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nest-pay-theta.vercel.app'

        const qbResponse = await fetch(`${appUrl}/api/quickbooks/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: pi.amount,
            tenantName,
            unitName,
            paymentDate: new Date(pi.created * 1000).toISOString().split('T')[0],
            stripePaymentId: pi.id,
          }),
        })

        if (!qbResponse.ok) {
          const qbError = await qbResponse.json()
          console.error('QuickBooks sync failed:', qbError)
          // Not throwing — QB sync failure should not fail the webhook
        } else {
          console.log('QuickBooks sync successful for payment:', pi.id)
        }
      }
    } catch (qbErr) {
      console.error('QuickBooks sync error:', qbErr)
      // Not throwing — QB sync failure should not fail the webhook
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
