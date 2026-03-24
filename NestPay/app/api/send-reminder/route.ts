import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await req.json()

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*, units(unit_number, monthly_rent)')
      .eq('id', tenantId)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Plug in Resend or SendGrid here when ready
    // import { Resend } from 'resend'
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({ from: 'NestPay <noreply@yourdomain.com>', to: tenant.email, ... })

    console.log(`Reminder → ${tenant.email} for Unit ${tenant.units.unit_number}`)
    return NextResponse.json({ success: true, sentTo: tenant.email })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}