import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId } = await req.json()
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('email, full_name, units(unit_number, monthly_rent, properties(name, landlord_id))')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const landlordId = (tenant as any).units?.properties?.landlord_id
    if (!landlordId || landlordId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const unitNumber = (tenant as any).units?.unit_number ?? '—'
    const propertyName = (tenant as any).units?.properties?.name ?? 'your unit'
    const rent = (tenant as any).units?.monthly_rent
      ? `$${Number((tenant as any).units.monthly_rent).toFixed(2)}`
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
