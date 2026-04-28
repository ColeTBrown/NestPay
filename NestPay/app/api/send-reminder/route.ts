import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await req.json()

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*, units(unit_number, monthly_rent, properties(name))')
      .eq('id', tenantId)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const unitNumber = tenant.units?.unit_number ?? '—'
    const propertyName = tenant.units?.properties?.name ?? 'your unit'
    const rent = tenant.units?.monthly_rent
      ? `$${Number(tenant.units.monthly_rent).toFixed(2)}`
      : 'your rent'

    const subject = `Rent reminder for ${propertyName} (Unit ${unitNumber})`
    const html = `
      <p>Hi ${tenant.full_name || ''},</p>
      <p>This is a friendly reminder that <strong>${rent}</strong> is due for
      <strong>${propertyName}, Unit ${unitNumber}</strong>.</p>
      <p>You can pay through your Rentidge tenant portal.</p>
      <p>— Rentidge</p>
    `
    const text =
      `Hi ${tenant.full_name || ''},\n\n` +
      `Reminder: ${rent} is due for ${propertyName}, Unit ${unitNumber}.\n` +
      `Pay through your Rentidge tenant portal.\n\n— Rentidge`

    await sendEmail({ to: tenant.email, subject, html, text })

    return NextResponse.json({ success: true, sentTo: tenant.email })
  } catch (err: any) {
    console.error('send-reminder error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
