import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { requireLandlord } from '@/lib/auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    // C3: previously took landlordId from the request body, allowing any
    // unauthenticated caller to dump full property/payment data for any
    // landlord and burn Anthropic credits. Now we derive landlordId from
    // the verified session and reject anyone who isn't a landlord.
    const auth = await requireLandlord()
    if ('response' in auth) return auth.response
    const landlordId = auth.landlordId

    const { message, history } = await req.json()
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const { data: properties } = await supabaseAdmin
      .from('properties')
      .select('*, units(*, tenants(*), maintenance_requests(*))')
      .eq('landlord_id', landlordId)

    const { data: recentPayments } = await supabaseAdmin
      .from('payments')
      .select('*, tenants(full_name, units(unit_number))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    // Note: property/tenant fields are user-supplied data being embedded in
    // the system prompt — that's a soft prompt-injection surface. Tracking
    // as M1 in the audit; will be hardened in a later PR (separate user
    // role messages, explicit untrusted-data delimiters).
    const systemPrompt = `You are Rentidge AI, a smart property management assistant. Today is ${today}.
You have access to the landlord's live property data. Be concise and actionable.
Format your daily briefing with numbered tasks. Keep responses under 200 words unless asked for detail.

LIVE PROPERTY DATA:
${JSON.stringify(properties, null, 2)}

PENDING PAYMENTS:
${JSON.stringify(recentPayments, null, 2)}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...(Array.isArray(history) ? history : []), { role: 'user', content: message }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('[ai-briefing] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
