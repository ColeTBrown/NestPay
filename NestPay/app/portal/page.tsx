'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autopay, setAutopay] = useState(false)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/portal?paid=1` },
      redirect: 'if_required',
    })

    if (result.error) {
      setError(result.error.message || 'Payment failed')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay}>
      <PaymentElement />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', padding: 12, background: 'var(--bg3)', borderRadius: 8, fontSize: 13, color: 'var(--text2)' }}>
        <input type="checkbox" id="ap" checked={autopay} onChange={e => setAutopay(e.target.checked)} style={{ width: 'auto' }} />
        <label htmlFor="ap" style={{ cursor: 'pointer' }}>Save card and enable autopay on the 1st each month</label>
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <button className="btn btn-primary btn-full" type="submit" disabled={loading || !stripe} style={{ fontSize: 15, padding: '13px' }}>
        {loading ? 'Processing...' : 'Pay now'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>Secured by Stripe · 256-bit SSL</p>
    </form>
  )
}

function OnboardingForm({ userId, email, onComplete }: { userId: string, email: string, onComplete: () => void }) {
  const [fullName, setFullName] = useState('')
  const [unitCode, setUnitCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('id, unit_number, monthly_rent, properties(name)')
      .eq('unit_number', unitCode.trim())
      .maybeSingle()

    if (unitError || !unit) {
      setError('Unit not found. Please check your unit code with your landlord.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('tenants')
      .insert({
        user_id: userId,
        unit_id: unit.id,
        full_name: fullName.trim(),
        email: email,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    onComplete()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="logo" style={{ fontSize: 28, marginBottom: 8 }}>Rent<span>idge</span></div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Let's get your account set up</p>
        </div>
        <div className="card">
          <h2 style={{ fontWeight: 500, fontSize: 18, marginBottom: 4 }}>Welcome</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
            Fill in your details to get started. Ask your landlord for your unit code.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Alex Smith" required />
            </div>
            <div className="field">
              <label>Unit code</label>
              <input type="text" value={unitCode} onChange={e => setUnitCode(e.target.value)} placeholder="e.g. 2B" required />
              <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>Your landlord will give you this code.</p>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 14 }}>{error}</p>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Setting up...' : 'Get started'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function AISupportTab({ tenant, unit }: { tenant: any, unit: any }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: `Hi ${tenant?.full_name?.split(' ')[0] || 'there'}! I'm your Rentidge support assistant. I can help you with maintenance questions, renting advice, and anything about your unit. What can I help you with?`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  const suggested = [
    'My faucet is dripping — is that urgent?',
    'What maintenance am I responsible for?',
    'How do I submit a maintenance request?',
    'My heat isn\'t working, what should I do?',
  ]

  async function sendMessage(msg: string) {
    if (!msg.trim() || loading) return
    setLoading(true)
    const updated = [...messages, { role: 'user' as const, content: msg }]
    setMessages(updated)
    setInput('')

    try {
      const res = await fetch('/api/ai-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages,
          tenantContext: {
            name: tenant?.full_name,
            unit: unit?.unit_number,
            property: unit?.properties?.name,
            monthlyRent: unit?.monthly_rent,
          },
          systemPrompt: `You are a helpful tenant support assistant for Rentidge, a property management platform. 
You help tenants with:
- Maintenance questions (what's urgent, DIY fixes, when to submit a request)
- Understanding their responsibilities as a tenant vs landlord responsibilities
- General renting advice and tenant rights
- How to use Rentidge features (submitting requests, paying rent, etc.)

The tenant you're helping is ${tenant?.full_name}, living in Unit ${unit?.unit_number} at ${unit?.properties?.name}, paying $${unit?.monthly_rent}/month.

Be friendly, concise, and practical. If something sounds like a safety emergency (gas leak, fire, flooding), always tell them to call emergency services first. 
Do not discuss specific lease terms you don't have access to. If a question requires landlord involvement, suggest they contact their landlord through the maintenance request system.`,
        }),
      })
      const { reply } = await res.json()
      setMessages([...updated, { role: 'assistant', content: reply }])
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' }])
    }

    setLoading(false)
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100)
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#020617' }}>AI</div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>Rentidge Support</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>AI-powered · Always available</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80' }}>
          <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
          Online
        </div>
      </div>

      {/* Chat thread */}
      <div ref={chatRef} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, background: 'var(--bg3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>AI</div>
            )}
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--bg3)',
              color: m.role === 'user' ? '#020617' : 'var(--text)',
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, background: 'var(--bg3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>AI</div>
            <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg3)', fontSize: 14, color: 'var(--text3)' }}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 20px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {suggested.map(q => (
            <button key={q} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
          placeholder="Ask a question about your unit..."
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

export default function PortalPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'pay' | 'maintenance' | 'history' | 'support'>('pay')
  const [tenant, setTenant] = useState<any>(null)
  const [unit, setUnit] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paySuccess, setPaySuccess] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [reqForm, setReqForm] = useState({ title: '', category: 'general', priority: 'normal', description: '' })
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')

  async function loadTenantData(uid: string) {
    const { data: t } = await supabase
      .from('tenants')
      .select('*, units(*, properties(name))')
      .eq('user_id', uid)
      .single()

    if (!t) {
      setNeedsOnboarding(true)
      setLoading(false)
      return
    }

    setTenant(t)
    setUnit(t.units)

    const { data: p } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', t.id)
      .order('created_at', { ascending: false })
    setPayments(p || [])

    const { data: r } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('tenant_id', t.id)
      .order('created_at', { ascending: false })
    setRequests(r || [])
    setLoading(false)
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)
      setUserEmail(session.user.email || '')
      await loadTenantData(session.user.id)
    }
    load()
  }, [router])

  async function startPayment() {
    if (!tenant) return
    const month = new Date().toISOString().slice(0, 7)
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tenant.id, paymentMonth: month, saveCard: true }),
    })
    const { clientSecret: cs } = await res.json()
    setClientSecret(cs)
  }

  async function submitRequest() {
    if (!tenant) return
    await supabase.from('maintenance_requests').insert({
      tenant_id: tenant.id,
      unit_id: tenant.unit_id,
      ...reqForm,
    })
    setShowRequestForm(false)
    setReqForm({ title: '', category: 'general', priority: 'normal', description: '' })
    const { data: r } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
    setRequests(r || [])
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentPayment = payments.find(p => p.payment_month === currentMonth && p.status === 'succeeded')

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text2)' }}>Loading...</div>
  )

  if (needsOnboarding) return (
    <OnboardingForm
      userId={userId}
      email={userEmail}
      onComplete={() => {
        setNeedsOnboarding(false)
        setLoading(true)
        loadTenantData(userId)
      }}
    />
  )

  return (
    <>
      <div className="topbar">
        <div className="logo">Rent<span>idge</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{tenant?.full_name}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}>Sign out</button>
        </div>
      </div>

      <div className="wrap">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Hi, {tenant?.full_name?.split(' ')[0]}</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Unit {unit?.unit_number} · {unit?.properties?.name}</p>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-label">Monthly rent</div>
            <div className="stat-val">${unit?.monthly_rent?.toLocaleString()}</div>
          </div>
          <div className="stat">
            <div className="stat-label">This month</div>
            <div className="stat-val" style={{ color: currentPayment ? 'var(--green)' : 'var(--gold)' }}>
              {currentPayment ? 'Paid' : 'Due'}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Open requests</div>
            <div className="stat-val blue">{requests.filter(r => r.status === 'open').length}</div>
          </div>
        </div>

        <div className="tabs">
          {(['pay', 'maintenance', 'history', 'support'] as const).map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'pay' ? 'Rent' : t === 'maintenance' ? 'Maintenance' : t === 'history' ? 'History' : 'Support'}
            </button>
          ))}
        </div>

        {tab === 'pay' && (
          <div>
            {paySuccess || currentPayment ? (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 6, color: 'var(--green)' }}>You're all set</div>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                  Rent paid for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            ) : clientSecret ? (
              <div className="card">
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
                  Paying <strong style={{ color: 'var(--text)' }}>${unit?.monthly_rent?.toLocaleString()}</strong> for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#38BDF8' } } }}
                >
                  <PaymentForm onSuccess={() => setPaySuccess(true)} />
                </Elements>
              </div>
            ) : (
              <div className="card">
                <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Amount due</div>
                  <div style={{ fontSize: 52, fontWeight: 500, letterSpacing: -2 }}>${unit?.monthly_rent?.toLocaleString()}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <button className="btn btn-primary btn-full" style={{ fontSize: 15, padding: 13 }} onClick={startPayment}>
                  Pay with card
                </button>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 12 }}>
                  {tenant?.autopay_enabled ? 'Autopay is on — card will be charged on the 1st' : 'Enable autopay after your first payment'}
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'maintenance' && (
          <div>
            {!showRequestForm ? (
              <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => setShowRequestForm(true)}>
                + New request
              </button>
            ) : (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 500, marginBottom: 16 }}>New maintenance request</h3>
                <div className="field">
                  <label>What's the issue?</label>
                  <input value={reqForm.title} onChange={e => setReqForm({ ...reqForm, title: e.target.value })} placeholder="e.g. Kitchen faucet dripping" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Category</label>
                    <select value={reqForm.category} onChange={e => setReqForm({ ...reqForm, category: e.target.value })}>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="appliance">Appliance</option>
                      <option value="hvac">HVAC</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Priority</label>
                    <select value={reqForm.priority} onChange={e => setReqForm({ ...reqForm, priority: e.target.value })}>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea value={reqForm.description} onChange={e => setReqForm({ ...reqForm, description: e.target.value })} placeholder="Any additional details..." />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={submitRequest}>Submit request</button>
                  <button className="btn btn-ghost" onClick={() => setShowRequestForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="label">Your requests</div>
            <div className="card">
              {requests.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 14 }}>No requests yet.</p>}
              {requests.map(r => (
                <div key={r.id} className="list-row">
                  <div>
                    <div className="row-title">{r.title}</div>
                    <div className="row-sub">{r.category} · {new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`tag tag-${r.status === 'resolved' ? 'done' : r.priority === 'urgent' ? 'urgent' : 'open'}`}>
                    {r.status === 'resolved' ? 'Resolved' : r.priority === 'urgent' ? 'Urgent' : 'Open'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            <div className="label">Payment history</div>
            <div className="card">
              {payments.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 14 }}>No payment history yet.</p>}
              {payments.map(p => (
                <div key={p.id} className="list-row">
                  <div>
                    <div className="row-title">
                      {new Date(p.payment_month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="row-sub">{p.paid_at ? `Paid ${new Date(p.paid_at).toLocaleDateString()}` : 'Pending'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 500 }}>${p.amount.toLocaleString()}</span>
                    <span className={`tag tag-${p.status === 'succeeded' ? 'paid' : p.status === 'failed' ? 'late' : 'open'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'support' && (
          <AISupportTab tenant={tenant} unit={unit} />
        )}
      </div>
    </>
  )
}
