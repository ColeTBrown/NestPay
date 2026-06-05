import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Pre-computed portfolio aggregations used by:
//   - /api/ai-briefing — passes the JSON into the AI's portfolio context so
//     the model can quote numbers and emit chart blocks with pre-computed
//     data (Claude isn't great at deriving multi-month time series).
//   - /api/cron/monthly-statements — uses aggregateMonthlyIncome() to build
//     the statement.

export type OccupancyPoint = { label: string; occupied: number; total: number; ratePercent: number }
export type StatusBreakdown = { label: string; value: number }
export type MonthlyIncomeRow = {
  unitNumber: string
  propertyName: string
  tenantName: string | null
  category: string
  amount: number
  paidAt: string | null
  paymentMonth: string
}

// Occupancy time series: for each of the last N months (incl. current),
// compute occupied/total based on tenants' lease_start..lease_end overlap
// with that month. Months without any units in the portfolio are skipped.
export async function computeOccupancyTimeSeries(
  landlordId: string,
  monthsBack = 6,
): Promise<OccupancyPoint[]> {
  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('id, units (id, tenants (lease_start, lease_end))')
    .eq('landlord_id', landlordId)

  const allUnits: { id: string; tenants: { lease_start: string | null; lease_end: string | null }[] }[] =
    (properties ?? []).flatMap((p: any) =>
      (p.units ?? []).map((u: any) => ({ id: u.id, tenants: u.tenants ?? [] })),
    )
  const totalUnits = allUnits.length
  if (totalUnits === 0) return []

  const now = new Date()
  const points: OccupancyPoint[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    const monthStr = d.toISOString().slice(0, 7) // YYYY-MM
    const monthFirst = `${monthStr}-01`

    // A unit is "occupied" in month M if it has a tenant whose
    // lease_start <= last day of M AND (lease_end IS NULL OR >= first of M).
    // We approximate "last day of M" with the first of M+1 minus epsilon by
    // comparing against the next month's first.
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    const nextStr = `${next.toISOString().slice(0, 7)}-01`

    let occupied = 0
    for (const u of allUnits) {
      const isOccupied = u.tenants.some(t => {
        const start = t.lease_start ?? null
        const end = t.lease_end ?? null
        if (!start) return false
        if (start >= nextStr) return false // lease starts after this month
        if (end && end < monthFirst) return false // lease ended before this month
        return true
      })
      if (isOccupied) occupied++
    }
    points.push({
      label: monthLabel,
      occupied,
      total: totalUnits,
      ratePercent: totalUnits === 0 ? 0 : Math.round((occupied / totalUnits) * 100),
    })
  }
  return points
}

// Payment-status breakdown for the given month (YYYY-MM). Counts payments
// by status: succeeded / pending / failed. Returns only buckets with > 0.
export async function computePaymentStatusBreakdown(
  landlordId: string,
  paymentMonth: string,
): Promise<StatusBreakdown[]> {
  // We need landlord-scoped payments. Join through unit -> property -> landlord.
  const { data } = await supabaseAdmin
    .from('payments')
    .select('status, units!inner(property_id, properties!inner(landlord_id))')
    .eq('payment_month', paymentMonth)
    .eq('units.properties.landlord_id', landlordId)

  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as any[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label, value }))
}

// Returns per-payment rows for the month, plus totals. Used by the monthly
// income statement email and the PDF.
export async function aggregateMonthlyIncome(landlordId: string, paymentMonth: string) {
  const { data } = await supabaseAdmin
    .from('payments')
    .select(`
      amount,
      category,
      status,
      paid_at,
      payment_month,
      tenants ( full_name ),
      units ( unit_number, property_id, properties ( name, landlord_id ) )
    `)
    .eq('payment_month', paymentMonth)

  const landlordRows: MonthlyIncomeRow[] = []
  for (const row of (data ?? []) as any[]) {
    if (row.units?.properties?.landlord_id !== landlordId) continue
    if (row.status !== 'succeeded') continue
    landlordRows.push({
      unitNumber: row.units?.unit_number ?? '?',
      propertyName: row.units?.properties?.name ?? '?',
      tenantName: row.tenants?.full_name ?? null,
      category: row.category ?? 'monthly_rent',
      amount: Number(row.amount) || 0,
      paidAt: row.paid_at ?? null,
      paymentMonth: row.payment_month,
    })
  }

  const totalCollected = landlordRows.reduce((sum, r) => sum + r.amount, 0)
  const byCategory: Record<string, number> = {}
  for (const r of landlordRows) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount
  }

  return { rows: landlordRows, totalCollected, byCategory }
}
