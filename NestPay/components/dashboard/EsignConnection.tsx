'use client'

import { useEffect, useState } from 'react'

// Landlord-side e-signature provider connection.
//
// BYO model: each landlord brings their own SignWell account. We collect
// their API key + API App ID, validate them with a live ping, and store
// them on the profiles row. Once connected, we surface the unique
// webhook URL they need to paste into SignWell's app settings.
//
// Disconnect just nulls out the credentials — we don't try to revoke
// the API key on SignWell's side since the landlord owns it.

type Status = {
  connected: boolean
  connectedAt: string | null
  hasApiKey: boolean
  hasApiAppId: boolean
  webhookUrl: string
}

export default function EsignConnection() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiAppId, setApiAppId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/landlord/esign-connection')
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function connect() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/landlord/esign-connection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey, apiAppId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not connect')
        return
      }
      setApiKey('')
      setApiAppId('')
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect SignWell? Tenants will not be able to sign documents until you reconnect.')) return
    await fetch('/api/landlord/esign-connection', { method: 'DELETE' })
    await load()
  }

  async function copyWebhook() {
    if (!status?.webhookUrl) return
    await navigator.clipboard.writeText(status.webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="card">
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>Loading e-signature status…</p>
      </div>
    )
  }

  if (status?.connected) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: 'var(--green, #4ADE80)' }} />
              SignWell connected
            </div>
            {status.connectedAt && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                Connected on {new Date(status.connectedAt).toLocaleDateString()}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={disconnect}>Disconnect</button>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg3)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
            Your webhook URL
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontSize: 12, color: 'var(--text2)', overflow: 'auto', whiteSpace: 'nowrap' }}>
              {status.webhookUrl}
            </code>
            <button className="btn btn-ghost btn-sm" onClick={copyWebhook}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>
            Paste this into SignWell → Settings → API → your app → Event Callback URL. Required so we know when tenants finish signing.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Connect SignWell</div>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
        Rentidge uses your SignWell account to send leases for signature. Tenants sign inside the Rentidge portal — they never see SignWell. Your account owns the audit trail and billing.
      </p>

      {!showForm ? (
        <>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>Setup steps:</strong>
            <ol style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>
                Sign up at <a href="https://www.signwell.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent, #38BDF8)' }}>signwell.com</a> (free trial — paid plan ~$8/mo for unlimited)
              </li>
              <li>Go to <strong>Settings → API</strong> → copy your API Key</li>
              <li>Create an API App on the same page → copy the Application ID</li>
              <li>Paste both below — we&apos;ll give you a webhook URL to plug back in</li>
            </ol>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            I have my keys, let&apos;s connect
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Paste your SignWell API key"
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, fontFamily: 'monospace' }}
              disabled={saving}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
              API Application ID
            </label>
            <input
              type="text"
              value={apiAppId}
              onChange={e => setApiAppId(e.target.value)}
              placeholder="UUID like 11b7116f-1242-..."
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, fontFamily: 'monospace' }}
              disabled={saving}
            />
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red, #F87171)', padding: '8px 10px', background: 'rgba(248,113,113,0.1)', borderRadius: 6 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={connect} disabled={saving || !apiKey || !apiAppId}>
              {saving ? 'Connecting…' : 'Test & save connection'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setError(null) }} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
