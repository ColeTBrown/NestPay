import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTenant } from '@/lib/auth'

// Returns the tenant's move-in + security deposit state plus the
// landlord's collection settings. Tenants can't read the landlord's
// profile row directly via RLS, so this hops the lookup server-side.
// Used by the portal to decide which payment card(s) to show.

export async function GET() {
  const auth = await requireTenant()
  if ('response' in auth) return auth.response

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select(`
      move_in_paid,
      last_month_held_amount,
      security_deposit_paid,
      security_deposit_held_amount,
      units (
        monthly_rent,
        security_deposit_amount,
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

  const unit = (tenant as any).units
  const landlordId = unit?.properties?.landlord_id
  const monthlyRent = Number(unit?.monthly_rent ?? 0)
  const securityDepositAmount = Number(unit?.security_deposit_amount ?? 0)

  let requireLastMonth = false
  let depositCollectionMode: 'bundled' | 'separate' = 'bundled'
  if (landlordId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('require_last_month_rent, deposit_collection_mode')
      .eq('id', landlordId)
      .single()
    requireLastMonth = profile?.require_last_month_rent === true
    if (profile?.deposit_collection_mode === 'separate') {
      depositCollectionMode = 'separate'
    }
  }

  // Count unsigned required-for-move-in documents. The portal shows a
  // pre-payment gate when this is > 0 so the tenant signs first instead
  // of clicking Pay and bouncing back with an error.
  const { count: unsignedRequiredCount } = await supabaseAdmin
    .from('lease_signatures')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId)
    .eq('required_for_move_in', true)
    .neq('status', 'signed')

  return NextResponse.json({
    requireLastMonth,
    moveInPaid: tenant.move_in_paid === true,
    monthlyRent,
    moveInAmount: monthlyRent * 2,
    lastMonthHeldAmount: Number((tenant as any).last_month_held_amount ?? 0),
    // Security deposit fields
    securityDepositRequired: securityDepositAmount > 0,
    securityDepositAmount,
    securityDepositPaid: tenant.security_deposit_paid === true,
    securityDepositHeldAmount: Number((tenant as any).security_deposit_held_amount ?? 0),
    depositCollectionMode,
    // Document gate
    unsignedRequiredDocsCount: unsignedRequiredCount ?? 0,
  })
}
