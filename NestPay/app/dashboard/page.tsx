'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'maintenance' | 'ai'>('overview')
  const [landlordId, setLandlordId] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const lid = session.user.id
      setLandlordId(lid)

      const { data: props } = await supabase
        .from('properties')
        .select('*, units(*, tenants(*), maintenance_requests(*))')
        .eq('landlord_id', lid)
      setProperties(props || [])

      const unitIds = (props || []).flatMap((p: any) => p.units.map((u: any) => u.id))
      if (unitIds.length > 0) {
        const { data: pays } = await supabase
          .from('payments')
          .select('*, tenants(full_name), units(unit_number)')
          .in('unit_id', unitIds)
          .order('created_at', { ascending: false })
          .limit(50)
        setPayments(pays || [])

        const { data: reqs } = await supabase
          .from('maintenance_requests')
          .select('*, tenants(full_name), units(unit_number)')
          .in('unit_id', unitIds)
          .order('created_at', { ascending: false })
        setRequests(reqs || [])
      }

      setLoading(false)
      sendAI("Give me today's daily briefing for my properties.", lid, [])
    }
    load()
  }, [router])

  async function sendAI(msg: string, lid?: string, hist?: any[]) {
    const id = lid || landlordId
    const history = hist !== undefined ? hist : messages
    setAiLoading(true)
    const updated = [...history, { role: 'user' as const, content: msg }]
    setMessages(updated)
    setAiInput('')

    const res = await fetch('/api/ai-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ landlordId: id, message: msg, history }),
    })
    const { reply } = await res.json()
    setMessages([...updated, { role: 'assistant', content: reply }])
    setAiLoading(false)
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100)
  }

  async function markResolved(id: string) {
    await supabase.from('maintenance_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r))
  }

  async function sendReminder(tenantId: string) {
    await fetch('/api/send-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    })
    alert('Reminder sent!')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text2)' }}>Loading...</div>
  )

  const currentMonth = new Date().toISOString().slice(0, 7)
  const collected = payments
    .filter(p => p.payment_month === currentMonth && p.status === 'succeeded')
    .reduce((s: number, p: any) => s + Number(p.amount), 0)
  const pending = payments.filter(p => p.payment_month === currentMonth && p.status !== 'succeeded')
  const openRequests = requests.filter(r => r.status !== 'resolved')
  const totalUnits = properties.flatMap((p: any) => p.units).length

  return (
    <>
      <div className="topbar">
        <div className="logo">Nest<span>Pay</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Landlord</span>
          <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}>Sign out</button>
        </div>
      </div>

      <div className="wrap">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Property dashboard</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {properties.map((p: any) => p.name).join(', ') || 'No properties yet'} · {totalUnits} units
          </p>
        </div>

        <div className="stats">
          <div className="stat"><div className="stat-label">Collected</div><div className="stat-val g">${collected.toLocaleString()}</div></div>
          <div className="stat"><div className="stat-label">Pending</div><div className="stat-val gold">{pending.length}</div></div>
          <div className="stat"><div className="stat-label">Open requests</div><div className="stat-val r">{openRequests.length}</div></div>
          <div className="stat"><div className="stat-label">Units</div><div className="stat-val blue">{totalUnits}</div></div>
        </div>

        <div className="tabs">
          {(['overview', 'maintenance', 'ai'] as const).map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? 'Payments' : t === 'maintenance' ? 'Maintenance' : 'AI assistant'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            <div className="label">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            <div className="card">
              {payments.filter(p => p.payment_month === currentMonth).length === 0 && (
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>No payments recorded yet. Add tenants in Supabase to get started.</p>
              )}
              {payments.filter(p => p.payment_month === currentMonth).map((p: any) => (
                <div key={p.id} className="list-row">
                  <div>
                    <div className="row-title">Unit {p.units?.unit_number} — {p.tenants?.full_name}</div>
                    <div className="row-sub">${Number(p.amount).toLocaleString()} · {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : 'pending'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`tag tag-${p.status === 'succeeded' ? 'paid' : p.status === 'failed' ? 'late' : 'open'}`}>
                      {p.status === 'succeeded' ? 'Paid' : p.status}
                    </span>
                    {p.status !== 'succeeded' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => sendReminder(p.tenant_id)}>Remind</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'maintenance' && (
          <div>
            <div className="label">Open requests</div>
            <div className="card" style={{ marginBottom: 20 }}>
              {openRequests.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 14 }}>All clear — no open requests.</p>}
              {openRequests.map((r: any) => (
                <div key={r.id} className="list-row">
                  <div>
                    <div className="row-title">Unit {r.units?.unit_number} — {r.title}</div>
                    <div className="row-sub">{r.tenants?.full_name} · {r.category} · {new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`tag tag-${r.priority === 'urgent' || r.priority === 'emergency' ? 'urgent' : 'open'}`}>{r.priority}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => markResolved(r.id)}>Resolve</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="label">Resolved</div>
            <div className="card">
              {requests.filter(r => r.status === 'resolved').length === 0 && <p style={{ color: 'var(--text2)', fontSize: 14 }}>None yet.</p>}
              {requests.filter(r => r.status === 'resolved').map((r: any) => (
                <div key={r.id} className="list-row">
                  <div>
                    <div className="row-title">Unit {r.units?.unit_number} — {r.title}</div>
                    <div className="row-sub">{r.category} · resolved {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString() : ''}</div>
                  </div>
                  <span className="tag tag-done">Resolved</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div className="card">
            <div ref={chatRef} className="chat-thread" style={{ maxHeight: 480, overflowY: 'auto' }}>
              {messages.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 14 }}>Loading your daily briefing...</p>}
              {messages.map((m, i) => (
                <div key={i} className="chat-msg" style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'assistant' && <div className="chat-avatar">AI</div>}
                  <div className={`chat-bubble ${m.role === 'user' ? 'user' : ''}`}>{m.content}</div>
                </div>
              ))}
              {aiLoading && (
                <div className="chat-msg">
                  <div className="chat-avatar">AI</div>
                  <div className="chat-bubble" style={{ color: 'var(--text3)' }}>Thinking...</div>
                </div>
              )}
            </div>

            <div className="chat-input-row">
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !aiLoading && aiInput.trim() && sendAI(aiInput)}
                placeholder="Ask about a unit, tenant, payment, or request..."
                disabled={aiLoading}
              />
              <button className="btn btn-primary" onClick={() => aiInput.trim() && sendAI(aiInput)} disabled={aiLoading || !aiInput.trim()}>
                Send
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {['Which units are late?', 'Any urgent maintenance?', 'Recommend a plumber', 'Who needs lease renewal?'].map(q => (
                <button key={q} className="btn btn-ghost btn-sm" onClick={() => sendAI(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}