import { NextRequest, NextResponse } from 'next/server'
import { esign } from '@/lib/esign'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTenant } from '@/lib/auth'

// Returns an embedded sign URL the portal can drop into an iframe via
// the Dropbox Sign embedded JS SDK. URLs are short-lived (~5 min) so
// we cache them on the row and re-fetch only when expired.

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant()
  if ('response' in auth) return auth.response

  const sigId = params.id

  // Look up the signature, confirm it belongs to this tenant, and grab
  // the provider-side signer id. RLS would scope reads via the browser
  // client, but we use the admin client here so we can also pull the
  // signature_request_id + provider info that the tenant shouldn't see.
  const { data: sig, error } = await supabaseAdmin
    .from('lease_signatures')
    .select(`
      id,
      tenant_id,
      status,
      signature_request_id,
      tenant_sign_url,
      tenant_sign_url_expires_at,
      lease_documents:document_id ( provider )
    `)
    .eq('id', sigId)
    .single()

  if (error || !sig) {
    return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
  }
  if (sig.tenant_id !== auth.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (sig.status === 'signed') {
    return NextResponse.json({ error: 'Already signed' }, { status: 409 })
  }
  if (!sig.signature_request_id) {
    return NextResponse.json(
      { error: 'No signature request yet — landlord must initiate signing first' },
      { status: 409 },
    )
  }

  // Reuse the cached URL if it's still fresh (>30s of life left).
  const cached = sig.tenant_sign_url
  const cachedExp = sig.tenant_sign_url_expires_at ? new Date(sig.tenant_sign_url_expires_at).getTime() : 0
  if (cached && cachedExp - Date.now() > 30_000) {
    return NextResponse.json({
      signUrl: cached,
      clientId: process.env.DROPBOX_SIGN_CLIENT_ID,
    })
  }

  // Fetch a fresh embedded sign URL from the provider. We need the
  // signer-side id (Dropbox Sign returns one id per signer in the
  // original signature request response). For simple one-signer leases
  // the signer id == the first signature id.
  const { data: sr } = await supabaseAdmin
    .from('lease_signatures')
    .select('signature_request_id')
    .eq('id', sigId)
    .single()
  if (!sr?.signature_request_id) {
    return NextResponse.json({ error: 'No signature request id' }, { status: 500 })
  }

  // The signer id is the signature_request_id's first signer. For
  // multi-signer flows we'd store this on the row when creating the
  // request; for v1 (tenant-only) signer id == signature_request_id's
  // first signature, which equals the signature_request_id in
  // Dropbox Sign's single-signer template flow.
  // TODO when adding co-signer support: store signer_id on the row.
  const signerId = sr.signature_request_id

  try {
    const { signUrl, expiresAt } = await esign.getEmbeddedSignUrl(signerId)
    await supabaseAdmin
      .from('lease_signatures')
      .update({
        tenant_sign_url: signUrl,
        tenant_sign_url_expires_at: expiresAt.toISOString(),
        status: 'awaiting_signature',
      })
      .eq('id', sigId)
    return NextResponse.json({
      signUrl,
      clientId: process.env.DROPBOX_SIGN_CLIENT_ID,
    })
  } catch (err: any) {
    console.error('[tenant/sign-url] provider error:', err)
    return NextResponse.json({ error: err?.message ?? 'Provider error' }, { status: 502 })
  }
}
