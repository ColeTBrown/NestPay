import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { aggregateMonthlyIncome } from '@/lib/portfolio-stats'
import { renderMonthlyStatementPdf } from '@/lib/pdf/monthly-statement'

// Triggered by Vercel Cron on the 1st of each month at 14:00 UTC (9 AM ET).
// Computes the previous month's income for every landlord, asks Claude for a
// 1-paragraph narrative summary, renders a PDF statement, and emails it via
// Resend with the PDF attached.
//
// Auth: Vercel Cron sets `Authorization: Bearer ${CRON_SECRET}` if you set
// CRON_SECRET in Vercel env. We verify it timing-safe; without the secret
// set (e.g., local dev) the route refuses entirely so it can't be invoked
// from the public internet.

export const maxDuration = 300 // 5 min — needed because we loop landlords and call Claude per-landlord

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`
  if (header.length !== expected.length) return false
  // Constant-time compare to avoid timing leaks of the secret prefix.
  let diff = 0
  for (let i = 0; i < header.length; i++) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

function previousMonth(): { paymentMonth: string; label: string } {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  return {
    paymentMonth: d.toISOString().slice(0, 7),
    label: d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  }
}

async function generateNarrative(monthLabel: string, totalCollected: number, byCategory: Record<string, number>, rowCount: number): Promise<string> {
  if (rowCount === 0) {
    return `No successful payments were recorded in ${monthLabel}. If this looks wrong, check whether tenants finished their Stripe payments — failed or pending charges don't appear here.`
  }
  try {
    const summary = `Month: ${monthLabel}. Total collected: $${totalCollected.toFixed(2)}. ` +
      `Payment count: ${rowCount}. By category: ${Object.entries(byCategory).map(([k, v]) => `${k}=$${v.toFixed(2)}`).join(', ')}.`

    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: `You write 1-paragraph narrative summaries of a landlord's monthly income for an emailed statement. Be specific, factual, neutral. NO speculation, NO advice, NO praise/criticism. 2-4 sentences max. Use the dollar amounts and counts given exactly. Mention category breakdown if there's more than one category. End on the actual data, not generalities.`,
      messages: [{ role: 'user', content: summary }],
    })
    return resp.content[0]?.type === 'text' ? resp.content[0].text : `Collected $${totalCollected.toFixed(2)} across ${rowCount} payments in ${monthLabel}.`
  } catch (err) {
    console.error('[cron/monthly-statements] narrative gen failed:', err)
    return `Collected $${totalCollected.toFixed(2)} across ${rowCount} payments in ${monthLabel}.`
  }
}

async function processOne(landlordId: string, landlordEmail: string, landlordName: string, paymentMonth: string, monthLabel: string): Promise<{ ok: boolean; reason?: string }> {
  const { rows, totalCollected, byCategory } = await aggregateMonthlyIncome(landlordId, paymentMonth)

  // Skip emailing landlords with literally no activity this month AND no
  // prior month either — first-time landlords just signed up don't need
  // a "$0 statement" in their inbox. (Once they've had any month with
  // activity we still send the $0 statement going forward, so they know
  // the system is working.)
  if (rows.length === 0) {
    const { count } = await supabaseAdmin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .lt('payment_month', paymentMonth)
    if (!count || count === 0) {
      return { ok: false, reason: 'no_activity_ever' }
    }
  }

  const narrative = await generateNarrative(monthLabel, totalCollected, byCategory, rows.length)
  const pdfBuffer = await renderMonthlyStatementPdf({
    landlordName,
    monthLabel,
    paymentMonth,
    narrative,
    rows,
    totalCollected,
    byCategory,
  })

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <div style="font-size:18px;font-weight:600;margin-bottom:4px;">Rent<span style="color:#38BDF8;">idge</span></div>
      <h1 style="font-size:22px;margin:16px 0 4px;">${monthLabel} statement</h1>
      <p style="color:#64748B;font-size:13px;margin:0 0 24px;">Prepared for ${landlordName}</p>
      <p style="font-size:14px;line-height:1.6;color:#1a1a1a;">${narrative}</p>
      <p style="font-size:14px;color:#1a1a1a;margin-top:24px;">
        <strong>Total collected:</strong> $${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p style="font-size:13px;color:#64748B;margin-top:24px;">A detailed PDF statement is attached.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
      <p style="font-size:11px;color:#94A3B8;">Sent automatically on the 1st of each month. Does not constitute tax advice.</p>
    </div>
  `

  await sendEmail({
    to: landlordEmail,
    subject: `${monthLabel} income statement`,
    html,
    text: `${monthLabel} statement\n\n${narrative}\n\nTotal collected: $${totalCollected.toFixed(2)}\n\nDetailed statement attached as PDF.`,
    attachments: [{ filename: `rentidge-${paymentMonth}.pdf`, content: pdfBuffer }],
  })
  return { ok: true }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { paymentMonth, label: monthLabel } = previousMonth()

  // Pull every landlord with a stripe-connected account (landlords without
  // payment ability haven't actually been collecting anything, so a $0
  // statement is noise — skip them).
  const { data: landlords, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, stripe_onboarding_complete')
    .eq('role', 'landlord')

  if (error) {
    console.error('[cron/monthly-statements] landlord lookup error:', error)
    return NextResponse.json({ error: 'Failed to load landlords' }, { status: 500 })
  }

  const results: { landlordId: string; ok: boolean; reason?: string; err?: string }[] = []
  for (const l of landlords ?? []) {
    try {
      // Skip landlords who never finished Stripe onboarding — they have no
      // payments yet by definition.
      if (!(l as any).stripe_onboarding_complete) {
        results.push({ landlordId: l.id, ok: false, reason: 'no_stripe' })
        continue
      }
      // Look up email + name from auth.users (profiles row doesn't carry these).
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(l.id)
      const email = u?.user?.email
      const fullName = (u?.user?.user_metadata as any)?.full_name || email?.split('@')[0] || 'there'
      if (!email) {
        results.push({ landlordId: l.id, ok: false, reason: 'no_email' })
        continue
      }
      const r = await processOne(l.id, email, fullName, paymentMonth, monthLabel)
      results.push({ landlordId: l.id, ...r })
    } catch (err: any) {
      console.error(`[cron/monthly-statements] processing failed for ${l.id}:`, err)
      results.push({ landlordId: l.id, ok: false, err: String(err?.message ?? err) })
    }
  }

  const sent = results.filter(r => r.ok).length
  const skipped = results.filter(r => !r.ok && r.reason).length
  const failed = results.filter(r => !r.ok && r.err).length
  console.log(`[cron/monthly-statements] month=${paymentMonth} sent=${sent} skipped=${skipped} failed=${failed}`)
  return NextResponse.json({ paymentMonth, sent, skipped, failed, results })
}
