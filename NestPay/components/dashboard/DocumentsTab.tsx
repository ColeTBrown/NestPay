'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Documents tab on the landlord dashboard. Lets the landlord:
//   - Upload PDFs/DOCX files to their library (templates and one-off uploads)
//   - See which files are assigned to which tenants and the signing status
//   - Assign a library document to a tenant + mark it required or optional
//   - Unassign a pending document
//
// All file storage goes through Supabase Storage bucket 'lease-documents'
// with paths formatted as {landlord_id}/{document_id}.{ext}. RLS on both
// the bucket and the tables enforces landlord scoping; no service role
// needed here.
//
// PR B will add the actual signing flow (Dropbox Sign embedded widget,
// webhook handler). For now, every assigned signature stays in 'pending'.

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const BUCKET = 'lease-documents'

type Doc = {
  id: string
  name: string
  description: string | null
  file_path: string
  file_size_bytes: number | null
  mime_type: string | null
  is_template: boolean
  created_at: string
}

type Signature = {
  id: string
  tenant_id: string
  document_id: string
  required_for_move_in: boolean
  status: string
  signed_at: string | null
  created_at: string
}

type Property = {
  id: string
  name: string
  address?: string | null
  units?: {
    id: string
    unit_number: string
    tenants?: { id: string; full_name: string }[]
  }[]
}

export default function DocumentsTab({ landlordId, properties }: { landlordId: string; properties: Property[] }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [sigs, setSigs] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [assignFor, setAssignFor] = useState<string | null>(null) // tenant id we're assigning a doc to
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tenantIds = properties.flatMap(p =>
    (p.units ?? []).flatMap(u => (u.tenants ?? []).map(t => t.id)),
  )

  async function reload() {
    setLoading(true)
    const { data: docsData } = await supabase
      .from('lease_documents')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false })
    setDocs(docsData ?? [])

    if (tenantIds.length > 0) {
      const { data: sigsData } = await supabase
        .from('lease_signatures')
        .select('*')
        .in('tenant_id', tenantIds)
      setSigs(sigsData ?? [])
    } else {
      setSigs([])
    }
    setLoading(false)
  }

  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [landlordId, properties.length])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().match(/\.(pdf|docx)$/)) {
      setUploadError('Only PDF and DOCX files are supported.')
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadError('File is over 10 MB. Compress or split it first.')
      return
    }

    setUploading(true)
    try {
      // Generate the document UUID client-side so we can compute the storage
      // path before inserting the row.
      const docId = crypto.randomUUID()
      const ext = file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf'
      const path = `${landlordId}/${docId}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || undefined })
      if (upErr) throw upErr

      const { error: insErr } = await supabase
        .from('lease_documents')
        .insert({
          id: docId,
          landlord_id: landlordId,
          name: file.name.replace(/\.[^.]+$/, ''), // strip extension for the display name
          file_path: path,
          file_size_bytes: file.size,
          mime_type: file.type || null,
          is_template: true,
        })
      if (insErr) throw insErr

      await reload()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      console.error('[documents/upload] error:', err)
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function renameDoc(docId: string, currentName: string) {
    const newName = window.prompt('Rename document', currentName)?.trim()
    if (!newName || newName === currentName) return
    await supabase.from('lease_documents').update({ name: newName }).eq('id', docId)
    await reload()
  }

  async function deleteDoc(docId: string, path: string) {
    if (!window.confirm('Delete this document? Any tenant assignments that are still pending will be removed too.')) return
    // Storage row first (avoid orphan files); RLS confines us to our own folder.
    await supabase.storage.from(BUCKET).remove([path])
    // DB cascade handles lease_signatures via the FK on delete restrict — we
    // need to ensure no signed signatures exist. Try the delete and surface
    // the error if any signed sigs are blocking.
    const { error } = await supabase.from('lease_documents').delete().eq('id', docId)
    if (error) {
      alert(`Cannot delete — ${error.message}. If a tenant has already signed this document, archive it instead.`)
    }
    await reload()
  }

  async function assignDoc(documentId: string, tenantId: string, required: boolean) {
    const { error } = await supabase
      .from('lease_signatures')
      .insert({ tenant_id: tenantId, document_id: documentId, required_for_move_in: required })
    if (error) {
      // Most likely the unique (tenant_id, document_id) constraint — already assigned.
      alert(error.message.includes('duplicate') ? 'That document is already assigned to this tenant.' : error.message)
      return
    }
    setAssignFor(null)
    await reload()
  }

  async function toggleRequired(sigId: string, current: boolean) {
    await supabase.from('lease_signatures').update({ required_for_move_in: !current }).eq('id', sigId)
    await reload()
  }

  async function unassign(sigId: string) {
    if (!window.confirm('Unassign this document from the tenant?')) return
    await supabase.from('lease_signatures').delete().eq('id', sigId)
    await reload()
  }

  // Helpers
  const sigsForTenant = (tid: string) => sigs.filter(s => s.tenant_id === tid)
  const tenantCountFor = (docId: string) => sigs.filter(s => s.document_id === docId).length
  const docName = (id: string) => docs.find(d => d.id === id)?.name ?? '(deleted)'
  const fmtSize = (b: number | null) => {
    if (!b) return ''
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="label">Document library</div>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            Upload leases, pet policies, disclosures — anything tenants need to sign. Templates are reusable across tenants.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={handleFile}
            disabled={uploading}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : '+ Upload document'}
          </button>
        </div>
      </div>

      {uploadError && (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{uploadError}</p>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        {loading ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Loading documents…</p>
        ) : docs.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            No documents yet. Upload a lease or other PDF/DOCX to get started.
          </p>
        ) : (
          docs.map(d => (
            <div key={d.id} className="list-row">
              <div>
                <div className="row-title">{d.name}</div>
                <div className="row-sub">
                  {(d.mime_type || '').includes('pdf') ? 'PDF' : (d.mime_type || '').includes('word') ? 'DOCX' : 'File'}
                  {d.file_size_bytes ? ` · ${fmtSize(d.file_size_bytes)}` : ''}
                  {' · '}{tenantCountFor(d.id)} tenant{tenantCountFor(d.id) === 1 ? '' : 's'} assigned
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => renameDoc(d.id, d.name)}>Rename</button>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteDoc(d.id, d.file_path)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="label">Properties ({properties.length})</div>
      {properties.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            No properties yet. Add a property in the Properties tab first.
          </p>
        </div>
      ) : (
        properties.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4 }}>
              <div className="row-title">{p.name}</div>
              {p.address && <div className="row-sub">{p.address}</div>}
            </div>

            {(p.units ?? []).length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 12 }}>No units yet.</p>
            ) : (
              (p.units ?? []).map(u => (
                <div key={u.id} style={{ borderTop: '1px solid var(--bg3)', paddingTop: 12, marginTop: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    Unit {u.unit_number}
                  </div>

                  {(u.tenants ?? []).length === 0 ? (
                    <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
                      Vacant — assign a tenant in the Properties tab before assigning documents.
                    </p>
                  ) : (
                    (u.tenants ?? []).map(tenant => {
                      const tenantSigs = sigsForTenant(tenant.id)
                      const unassignedDocs = docs.filter(d => !tenantSigs.find(s => s.document_id === d.id))
                      return (
                        <div key={tenant.id} style={{ marginTop: 8 }}>
                          <div className="row-sub" style={{ marginBottom: 8 }}>{tenant.full_name}</div>

                          {tenantSigs.length === 0 ? (
                            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 8 }}>No documents assigned.</p>
                          ) : (
                            <div style={{ marginBottom: 8 }}>
                              {tenantSigs.map(s => (
                                <div key={s.id} className="list-row" style={{ padding: '8px 0' }}>
                                  <div>
                                    <div style={{ fontSize: 14 }}>{docName(s.document_id)}</div>
                                    <div className="row-sub">
                                      <span className={`tag tag-${s.status === 'signed' ? 'paid' : s.status === 'declined' ? 'late' : 'open'}`} style={{ marginRight: 8 }}>
                                        {s.status === 'signed' ? 'Signed' : s.status === 'declined' ? 'Declined' : 'Pending'}
                                      </span>
                                      {s.required_for_move_in ? 'Required for move-in' : 'Optional'}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {s.status === 'pending' && (
                                      <>
                                        <button className="btn btn-ghost btn-sm" onClick={() => toggleRequired(s.id, s.required_for_move_in)}>
                                          {s.required_for_move_in ? 'Make optional' : 'Make required'}
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => unassign(s.id)}>Unassign</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {assignFor === tenant.id ? (
                            <AssignPicker
                              unassignedDocs={unassignedDocs}
                              onCancel={() => setAssignFor(null)}
                              onAssign={(docId, required) => assignDoc(docId, tenant.id, required)}
                            />
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setAssignFor(tenant.id)}
                              disabled={unassignedDocs.length === 0}
                            >
                              + Assign document
                            </button>
                          )}
                          {unassignedDocs.length === 0 && tenantSigs.length === docs.length && docs.length > 0 && (
                            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>All documents already assigned.</p>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              ))
            )}
          </div>
        ))
      )}
    </div>
  )
}

function AssignPicker({
  unassignedDocs,
  onCancel,
  onAssign,
}: {
  unassignedDocs: Doc[]
  onCancel: () => void
  onAssign: (docId: string, required: boolean) => void
}) {
  const [docId, setDocId] = useState(unassignedDocs[0]?.id ?? '')
  const [required, setRequired] = useState(true)
  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12, marginTop: 8 }}>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Document</label>
        <select value={docId} onChange={e => setDocId(e.target.value)}>
          {unassignedDocs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} style={{ width: 'auto' }} />
        Required before tenant can pay move-in
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onAssign(docId, required)} disabled={!docId}>
          Assign
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
