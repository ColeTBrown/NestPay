import { NextRequest, NextResponse } from 'next/server'
import { esignForLandlord, ESignNotConnectedError } from '@/lib/esign'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTenant } from '@/lib/auth'

// Returns an embedded sign URL the portal can drop into an iframe via
// the e-sign provider's JS SDK. Cached on the row at creation time
// (SignWell returns the URL synchronously). This route is the refresh
// path for when the cached URL expires.

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
      lease_documents:document_id ( provider, landlord_id )
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
    return NextResponse.json({ signUrl: cached })
  }

  // Refresh path — fetch a fresh URL from the provider scoped to the
  // landlord who owns the document. For SignWell, signer id == document id.
  const landlordId = (sig as any).lease_documents?.landlord_id
  if (!landlordId) {
    return NextResponse.json({ error: 'Could not resolve landlord for this signature' }, { status: 500 })
  }
  const signerId = sig.signature_request_id

  try {
    const esign = await esignForLandlord(landlordId)
    const { signUrl, expiresAt } = await esign.getEmbeddedSignUrl(signerId)
    await supabaseAdmin
      .from('lease_signatures')
      .update({
        tenant_sign_url: signUrl,
        tenant_sign_url_expires_at: expiresAt.toISOString(),
        status: 'awaiting_signature',
      })
      .eq('id', sigId)
    return NextResponse.json({ signUrl })
  } catch (err: any) {
    if (err instanceof ESignNotConnectedError) {
      return NextResponse.json(
        { error: 'Landlord has not connected their e-signature provider. Please contact them.', code: 'esign_not_connected' },
        { status: 412 },
      )
    }
    console.error('[tenant/sign-url] provider error:', err)
    return NextResponse.json({ error: err?.message ?? 'Provider error' }, { status: 502 })
  }
}
