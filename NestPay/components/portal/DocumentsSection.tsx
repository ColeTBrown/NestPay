'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { openEmbedded } from '@/lib/esign/embed'

// Tenant-side documents view. Shows every document the landlord has
// assigned to this tenant + sign / download actions per row.
//
// Statuses (mirrors lease_signatures.status):
//   pending             — landlord assigned but provider request not yet created
//                         (rare — only happens if provider call failed mid-flow)
//   awaiting_signature  — ready for tenant to sign
//   signed              — done, signed PDF available
//   declined            — tenant declined; would need landlord to reassign
//   expired             — signature request canceled / timed out
//
// The Sign button fetches a short-lived embedded sign URL and opens the
// Dropbox Sign iframe via hellosign-embedded. On success, we re-read
// the rows — the webhook handler flips status to 'signed' and stashes
// the signed PDF in the signed-leases bucket.

type SignatureRow = {
  id: string
  status: string
  required_for_move_in: boolean
  signed_at: string | null
  signed_file_path: string | null
  document: {
    name: string
    mime_type: string | null
    file_size_bytes: number | null
  } | null
}

export default function DocumentsSection({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<SignatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // RLS scopes this query to the tenant's own signatures via the
    // lease_signatures_tenant_select policy.
    const { data } = await supabase
      .from('lease_signatures')
      .select(`
        id,
        status,
        required_for_move_in,
        signed_at,
        signed_file_path,
        document:document_id ( name, mime_type, file_size_bytes )
      `)
      .order('created_at', { ascending: false })
    setRows((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function startSign(sigId: string) {
    setOpening(sigId)
    try {
      const res = await fetch(`/api/tenant/signatures/${sigId}/sign-url`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Could not open signing widget')
        return
      }
      openEmbedded({
        url: data.signUrl,
        clientId: data.clientId,
        testMode: true,
        onFinish: async () => {
          // The webhook updates the row to 'signed' once Dropbox Sign
          // processes the signature on their end. Refresh after a short
          // delay so we pick up the new status.
          await new Promise(r => setTimeout(r, 1500))
          await load()
          onChange?.()
        },
      })
    } finally {
      setOpening(null)
    }
  }

  async function downloadSigned(path: string) {
    const { data, error } = await supabase.storage
      .from('signed-leases')
      .createSignedUrl(path, 60)
    if (error || !data?.signedUrl) {
      alert('Could not generate download link')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  if (loading) return <p style={{ color: 'var(--text2)', fontSize: 14 }}>Loading documents…</p>

  if (rows.length === 0) {
    return (
      <div className="card">
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          No documents to sign right now.
        </p>
      </div>
    )
  }

  return (
    <div>
      {rows.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div className="row-title">{r.document?.name ?? '(deleted)'}</div>
              <div className="row-sub">
                <span className={`tag tag-${r.status === 'signed' ? 'paid' : r.status === 'declined' ? 'late' : 'open'}`} style={{ marginRight: 8 }}>
                  {r.status === 'signed' ? 'Signed'
                    : r.status === 'declined' ? 'Declined'
                    : r.status === 'awaiting_signature' ? 'Ready to sign'
                    : r.status === 'expired' ? 'Expired'
                    : 'Pending'}
                </span>
                {r.required_for_move_in ? 'Required for move-in' : 'Optional'}
                {r.signed_at && ` · Signed ${new Date(r.signed_at).toLocaleDateString()}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {r.status === 'signed' && r.signed_file_path && (
                <button className="btn btn-ghost btn-sm" onClick={() => downloadSigned(r.signed_file_path!)}>
                  Download
                </button>
              )}
              {(r.status === 'awaiting_signature' || r.status === 'pending') && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => startSign(r.id)}
                  disabled={opening === r.id || r.status === 'pending'}
                  title={r.status === 'pending' ? 'Landlord must initiate this signature request — contact them if it stays pending' : undefined}
                >
                  {opening === r.id ? 'Opening…' : 'Sign'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
