import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTenant } from '@/lib/auth'

// Returns the tenant's move-in payment state plus the landlord's
// require_last_month_rent setting. The tenant can't read the landlord's
// profile row directly (RLS), so we hop it server-side. Used by the
// portal to decide whether to show the move-in card and at what amount.

export async function GET() {
  const auth = await requireTenant()
  if ('response' in auth) return auth.response

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select(`
      move_in_paid,
      last_month_held_amount,
      units (
        monthly_rent,
        properties (
          landlord_id
        )
      )
    `)
    .eq('id', auth.tenantId)
    .single()

  if (error || !tenant) {
    console.error('[tenant/move-in-status] tenant lookup error:', error)
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const landlordId = (tenant as any).units?.properties?.landlord_id
  const monthlyRent = Number((tenant as any).units?.monthly_rent ?? 0)

  let requireLastMonth = false
  if (landlordId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('require_last_month_rent')
      .eq('id', landlordId)
      .single()
    requireLastMonth = profile?.require_last_month_rent === true
  }

  return NextResponse.json({
    requireLastMonth,
    moveInPaid: tenant.move_in_paid === true,
    monthlyRent,
    moveInAmount: monthlyRent * 2,
    lastMonthHeldAmount: Number((tenant as any).last_month_held_amount ?? 0),
  })
}
