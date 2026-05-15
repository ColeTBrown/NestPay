'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Official Stripe wordmark
function StripeLogo() {
  return (
    <svg viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" style={{ height: 22, width: 'auto', display: 'block' }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.58-.24 1.58-1C6.31 14.84 0 15.58 0 10.96 0 8.05 2.18 6.3 5.62 6.3c1.32 0 2.63.16 3.92.74v3.59c-1.18-.62-2.69-1.07-3.93-1.07-.83 0-1.41.24-1.41.94 0 1.79 6.36.94 6.36 5.96z" fill="#635BFF"/>
    </svg>
  )
}

// Official Intuit QuickBooks mark (green circle with "qb")
function QuickBooksLogo() {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ height: 28, width: 28, display: 'block' }}>
      <circle cx="16" cy="16" r="16" fill="#2CA01C"/>
      <text x="16" y="21" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="13" fill="#fff">qb</text>
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'properties' | 'maintenance' | 'ai'>('overview')
  const [landlordId, setLandlordId] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const [qbConnected, setQbConnected] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [propertyForm, setPropertyForm] = useState({ name: '', address: '' })
  const [propertyLoading, setPropertyLoading] = useState(false)
  const [propertyError, setPropertyError] = useState('')

  const [showUnitForm, setShowUnitForm] = useState<string | null>(null)
  const [unitForm, setUnitForm] = useState({ unit_number: '', monthly_rent: '' })
  const [unitLoading, setUnitLoading] = useState(false)
  const [unitError, setUnitError] = useState('')

  async function loadData(lid: string) {
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
    } else {
      setPayments([])
      setRequests([])
    }
  }

  async function checkQBConnection(lid: string) {
    const { data } = await supabase
      .from('quickbooks_tokens')
      .select('realm_id')
      .eq('landlord_id', lid)
      .limit(1)
      .single()
    setQbConnected(!!data)
  }

  async function checkStripeConnection(lid: string) {
    const { data } = await supabase
      .from('profiles')
      .select('stripe_onboarding_complete')
      .eq('id', lid)
      .single()
    setStripeConnected(!!data?.stripe_onboarding_complete)
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const lid = session.user.id
      setLandlordId(lid)
      await loadData(lid)
      await checkQBConnection(lid)
      await checkStripeConnection(lid)
      setLoading(false)
      sendAI("Give me today's daily briefing for my properties.", lid, [])
    }
    load()
  }, [router])

  async function addProperty() {
    setPropertyLoading(true)
    setPropertyError('')
    const { error } = await supabase.from('properties').insert({
      landlord_id: landlordId,
      name: propertyForm.name.trim(),
      address: propertyForm.address.trim(),
    })
    if (error) {
      setPropertyError(error.message)
    } else {
      setShowPropertyForm(false)
      setPropertyForm({ name: '', address: '' })
      await loadData(landlordId)
    }
    setPropertyLoading(false)
  }

  async function addUnit(propertyId: string) {
    setUnitLoading(true)
    setUnitError('')
    const { error } = await supabase.from('units').insert({
      property_id: propertyId,
      unit_number: unitForm.unit_number.trim(),
      monthly_rent: parseFloat(unitForm.monthly_rent),
    })
    if (error) {
      setUnitError(error.message)
    } else {
      setShowUnitForm(null)
      setUnitForm({ unit_number: '', monthly_rent: '' })
      await loadData(landlordId)
    }
    setUnitLoading(false)
  }

  async function deleteProperty(propertyId: string, propertyName: string, unitCount: number) {
    if (unitCount > 0) {
      alert(`Cannot delete "${propertyName}" — it has ${unitCount} unit${unitCount === 1 ? '' : 's'}. Delete the units first.`)
      return
    }
    if (!confirm(`Delete "${propertyName}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId)
      .eq('landlord_id', landlordId)

    if (error) {
      alert('Failed to delete property: ' + error.message)
      return
    }
    await loadData(landlordId)
  }

  async function deleteUnit(unitId: string, unitNumber: string, hasTenants: boolean) {
    if (hasTenants) {
      alert(`Cannot delete Unit ${unitNumber} — a tenant is currently linked to it. Remove the tenant first.`)
      return
    }
    if (!confirm(`Delete Unit ${unitNumber}? Any payments and maintenance requests will also be deleted. This cannot be undone.`)) return

    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', unitId)

    if (error) {
      alert('Failed to delete unit: ' + error.message)
      return
    }
    await loadData(landlordId)
  }

  async function regenerateInviteCode(unitId: string) {
    if (!confirm('Regenerate invite code? The old code will stop working immediately.')) return

    const { data, error } = await supabase.rpc('generate_invite_code')

    if (error || !data) {
      alert('Failed to generate new code. Try again.')
      return
    }

    const { error: updateError } = await supabase
      .from('units')
      .update({ invite_code: data, invite_code_used: false })
      .eq('id', unitId)

    if (updateError) {
      alert('Failed to update invite code: ' + updateError.message)
      return
    }

    await loadData(landlordId)
  }

  async function copyInviteCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      alert('Could not copy to clipboard')
    }
  }

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
      body: JSON.stringify({ message: msg, history }),
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
        <div className="logo">Rent<span>idge</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Landlord</span>
          <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}>Sign out</button>
        </div>
      </div>

      <div className="wrap">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Property dashboard</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {properties.length === 0 ? 'No properties yet' : properties.map((p: any) => p.name).join(', ')} · {totalUnits} units
          </p>
        </div>

        <div className="stats">
          <div className="stat"><div className="stat-label">Collected</div><div className="stat-val g">${collected.toLocaleString()}</div></div>
          <div className="stat"><div className="stat-label">Pending</div><div className="stat-val gold">{pending.length}</div></div>
          <div className="stat"><div className="stat-label">Open requests</div><div className="stat-val r">{openRequests.length}</div></div>
          <div className="stat"><div className="stat-label">Units</div><div className="stat-val blue">{totalUnits}</div></div>
        </div>

        <div className="tabs">
          {(['overview', 'properties', 'maintenance', 'ai'] as const).map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? 'Payments' : t === 'properties' ? 'Properties' : t === 'maintenance' ? 'Maintenance' : 'AI assistant'}
            </button>
          ))}
        </div>

        {tab === 'properties' && (
          <div>
            <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => setShowPropertyForm(true)}>
              + Add property
            </button>

            {showPropertyForm && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 500, marginBottom: 16 }}>New property</h3>
                <div className="field">
                  <label>Property name</label>
                  <input value={propertyForm.name} onChange={e => setPropertyForm({ ...propertyForm, name: e.target.value })} placeholder="e.g. Sunset Apartments" />
                </div>
                <div className="field">
                  <label>Address</label>
                  <input value={propertyForm.address} onChange={e => setPropertyForm({ ...propertyForm, address: e.target.value })} placeholder="e.g. 123 Main St, Boston MA" />
                </div>
                {propertyError && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{propertyError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={addProperty} disabled={propertyLoading || !propertyForm.name || !propertyForm.address}>
                    {propertyLoading ? 'Saving...' : 'Save property'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setShowPropertyForm(false); setPropertyForm({ name: '', address: '' }) }}>Cancel</button>
                </div>
              </div>
            )}

            {properties.length === 0 && !showPropertyForm && (
              <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>No properties yet. Add your first property to get started.</p>
              </div>
            )}

            {properties.map((property: any) => (
              <div key={property.id} className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 16 }}>{property.name}</div>
                    <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{property.address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowUnitForm(property.id); setUnitError('') }}>
                      + Add unit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteProperty(property.id, property.name, property.units.length)}
                      style={{ color: 'var(--red)', borderColor: 'rgba(252,107,107,0.3)' }}
                      title={property.units.length > 0 ? 'Delete all units first' : 'Delete property'}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {showUnitForm === property.id && (
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <h4 style={{ fontWeight: 500, marginBottom: 12, fontSize: 14 }}>New unit</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="field">
                        <label>Unit number</label>
                        <input value={unitForm.unit_number} onChange={e => setUnitForm({ ...unitForm, unit_number: e.target.value })} placeholder="e.g. 2B" />
                      </div>
                      <div className="field">
                        <label>Monthly rent ($)</label>
                        <input type="number" value={unitForm.monthly_rent} onChange={e => setUnitForm({ ...unitForm, monthly_rent: e.target.value })} placeholder="e.g. 1500" />
                      </div>
                    </div>
                    {unitError && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{unitError}</p>}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => addUnit(property.id)} disabled={unitLoading || !unitForm.unit_number || !unitForm.monthly_rent}>
                        {unitLoading ? 'Saving...' : 'Save unit'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setShowUnitForm(null); setUnitForm({ unit_number: '', monthly_rent: '' }) }}>Cancel</button>
                    </div>
                  </div>
                )}

                {property.units.length === 0 ? (
                  <p style={{ color: 'var(--text2)', fontSize: 13 }}>No units yet.</p>
                ) : (
                  property.units.map((unit: any) => {
                    const isOccupied = unit.tenants?.length > 0
                    return (
                      <div key={unit.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div className="row-title">Unit {unit.unit_number}</div>
                          <div className="row-sub">
                            ${Number(unit.monthly_rent).toLocaleString()}/mo
                            {isOccupied ? ` · ${unit.tenants[0].full_name}` : ' · Vacant'}
                          </div>
                          {!isOccupied && unit.invite_code && (
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Invite code</span>
                              <code style={{
                                background: 'var(--bg3)',
                                padding: '4px 10px',
                                borderRadius: 4,
                                color: 'var(--accent)',
                                fontFamily: 'monospace',
                                fontSize: 13,
                                letterSpacing: 0.5,
                                fontWeight: 500
                              }}>{unit.invite_code}</code>
                              <button
                                onClick={() => copyInviteCode(unit.invite_code)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--border2)',
                                  color: copiedCode === unit.invite_code ? 'var(--green)' : 'var(--text2)',
                                  padding: '3px 10px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                {copiedCode === unit.invite_code ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                onClick={() => regenerateInviteCode(unit.id)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--border2)',
                                  color: 'var(--text2)',
                                  padding: '3px 10px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                Regenerate
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`tag ${isOccupied ? 'tag-paid' : 'tag-open'}`}>
                            {isOccupied ? 'Occupied' : 'Vacant'}
                          </span>
                          <button
                            onClick={() => deleteUnit(unit.id, unit.unit_number, isOccupied)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(252,107,107,0.3)',
                              color: 'var(--red)',
                              padding: '3px 10px',
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                            title={isOccupied ? 'Remove tenant first' : 'Delete unit'}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'overview' && (
          <div>
            {/* QuickBooks Integration Banner */}
            <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <QuickBooksLogo />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>QuickBooks</div>
                  <div style={{ color: 'var(--text2)', fontSize: 13 }}>
                    {qbConnected ? 'Payments auto-sync to QuickBooks as income entries' : 'Connect to auto-sync rent payments as income'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {qbConnected && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: 13, fontWeight: 500 }}>
                    <span style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
                    Connected
                  </span>
                )}
                <button
                  className={qbConnected ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
                  onClick={() => window.location.href = `/api/quickbooks/auth`}
                >
                  {qbConnected ? 'Reconnect' : 'Connect QuickBooks'}
                </button>
              </div>
            </div>

            {/* Stripe Connect Banner */}
            <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
                  <StripeLogo />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>Stripe Payments</div>
                  <div style={{ color: 'var(--text2)', fontSize: 13 }}>
                    {stripeConnected ? 'Rent payments deposit directly to your bank account' : 'Connect Stripe to receive rent payments directly'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {stripeConnected && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: 13, fontWeight: 500 }}>
                    <span style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
                    Connected
                  </span>
                )}
                {!stripeConnected && (
                  <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>Required to receive payments</span>
                )}
                <button
                  className={stripeConnected ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
                  onClick={() => {
                    if (!landlordId) {
                      alert('Session error — please refresh the page and try again.')
                      return
                    }
                    window.location.href = `/api/stripe/connect`
                  }}
                >
                  {stripeConnected ? 'Manage' : 'Connect Stripe'}
                </button>
              </div>
            </div>

            <div className="label">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            <div className="card">
              {payments.filter(p => p.payment_month === currentMonth).length === 0 && (
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>No payments recorded yet. Add a property and units to get started.</p>
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
