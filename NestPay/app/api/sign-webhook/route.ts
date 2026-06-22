import { NextRequest, NextResponse } from 'next/server'
import { esign } from '@/lib/esign'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Dropbox Sign webhook receiver.
//
// Dropbox Sign sends events as multipart/form-data with a single "json"
// field containing the event payload. We:
//   1. Parse the payload
//   2. Verify the HMAC via the provider's verifyWebhook()
//   3. Map known event types to lease_signatures status updates
//   4. On all_signed: download the signed PDF + audit cert and stash
//      them in the signed-leases bucket
//
// Dropbox Sign expects an HTTP 200 with the literal body "Hello API
// Event Received" — anything else they treat as a delivery failure
// and retry. (See https://developers.hellosign.com/docs/webhooks.)

const ACK_BODY = 'Hello API Event Received'

export async function POST(req: NextRequest) {
  let rawJson = ''
  try {
    // Try multipart first (Dropbox Sign's default). Fall back to JSON
    // body for providers that POST application/json directly.
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      rawJson = (form.get('json') as string) ?? ''
    } else {
      rawJson = await req.text()
    }
    if (!rawJson) {
      return new NextResponse('missing payload', { status: 400 })
    }
  } catch (err) {
    console.error('[sign-webhook] body parse error:', err)
    return new NextResponse('bad request', { status: 400 })
  }

  if (!esign.verifyWebhook(rawJson, req.headers.get('x-hellosign-signature'))) {
    console.warn('[sign-webhook] signature verification failed')
    return new NextResponse('bad signature', { status: 401 })
  }

  const event = esign.parseWebhookEvent(rawJson)

  try {
    switch (event.type) {
      case 'signature_request_all_signed':
        await handleAllSigned(event.signatureRequestId)
        break
      case 'signature_request_signed':
        // Single-signer flow: same as all_signed for our purposes
        await handleAllSigned(event.signatureRequestId)
        break
      case 'signature_request_declined':
        await markStatus(event.signatureRequestId, 'declined')
        break
      case 'signature_request_canceled':
        await markStatus(event.signatureRequestId, 'expired')
        break
      case 'template_created':
        // No-op — we already stored the templateId when we initiated the
        // embedded template draft. Logging only.
        console.log('[sign-webhook] template_created:', event.templateId)
        break
      default:
        // Ignore — many of Dropbox Sign's events (account.confirmed, etc)
        // don't affect us. Still ack so they stop retrying.
        break
    }
  } catch (err) {
    console.error('[sign-webhook] handler error for', event.type, err)
    // Return 500 so Dropbox Sign retries — better than swallowing a
    // permanent inconsistency.
    return new NextResponse('handler error', { status: 500 })
  }

  return new NextResponse(ACK_BODY, { status: 200 })
}

async function markStatus(signatureRequestId: string | undefined, status: string) {
  if (!signatureRequestId) return
  await supabaseAdmin
    .from('lease_signatures')
    .update({ status })
    .eq('signature_request_id', signatureRequestId)
}

async function handleAllSigned(signatureRequestId: string | undefined) {
  if (!signatureRequestId) return

  // Look up our signature row so we know which landlord folder to use.
  const { data: sig, error } = await supabaseAdmin
    .from('lease_signatures')
    .select(`
      id,
      tenant_id,
      tenants:tenant_id (
        units:unit_id (
          properties:property_id ( landlord_id )
        )
      )
    `)
    .eq('signature_request_id', signatureRequestId)
    .single()

  if (error || !sig) {
    console.warn('[sign-webhook] no lease_signatures row for', signatureRequestId)
    return
  }

  const landlordId = (sig as any).tenants?.units?.properties?.landlord_id
  if (!landlordId) {
    console.warn('[sign-webhook] could not resolve landlord for signature', sig.id)
    return
  }

  // Download from the provider.
  const { pdfBytes } = await esign.downloadSignedFile(signatureRequestId)

  // Stash in signed-leases bucket. Path: {landlord_id}/{signature_id}.pdf
  const path = `${landlordId}/${sig.id}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('signed-leases')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (upErr) {
    console.error('[sign-webhook] storage upload failed:', upErr)
    throw upErr
  }

  await supabaseAdmin
    .from('lease_signatures')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signed_file_path: path,
      // Clear the cached sign URL — no longer needed
      tenant_sign_url: null,
      tenant_sign_url_expires_at: null,
    })
    .eq('id', sig.id)
}
