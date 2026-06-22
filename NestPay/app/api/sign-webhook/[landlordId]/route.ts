import { NextRequest, NextResponse } from 'next/server'
import { esignForLandlord, ESignNotConnectedError } from '@/lib/esign'
import { supabaseAdmin } from '@/lib/supabase-admin'

// E-sign webhook receiver, scoped to a single landlord via URL path.
//
// Why URL-parameterized: in the BYO-account model each landlord has
// their own SignWell webhook secret. We need to know whose secret to
// verify with before we trust the payload. The landlord registers
// /api/sign-webhook/<their_landlord_id> as their callback URL when
// they set up the connection — see the dashboard Settings UI.
//
// Verification:
//   - Look up the landlord and load their credentials
//   - Call provider.verifyWebhook with the provider-scoped secret
//   - If verification fails, return 401 without touching state
//
// On signed events: download the PDF, stash in signed-leases bucket
// under the landlord's folder, flip the lease_signatures row to 'signed'.

export async function POST(req: NextRequest, { params }: { params: { landlordId: string } }) {
  const landlordId = params.landlordId
  if (!landlordId) {
    return new NextResponse('missing landlord id', { status: 400 })
  }

  let rawJson = ''
  try {
    // SignWell sends application/json. The multipart branch covers
    // providers that prefer form-encoded payloads.
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

  // Resolve the landlord's e-sign provider before verification — we
  // need their credentials to check the HMAC.
  let esign
  try {
    esign = await esignForLandlord(landlordId)
  } catch (err) {
    if (err instanceof ESignNotConnectedError) {
      // The landlord disconnected their account but SignWell still has
      // their old webhook URL configured. Return 410 Gone so they get
      // a clear signal to remove it.
      return new NextResponse('landlord no longer connected', { status: 410 })
    }
    console.error('[sign-webhook] esignForLandlord error:', err)
    return new NextResponse('lookup error', { status: 500 })
  }

  const sigHeader = req.headers.get('x-signwell-signature')
  if (!esign.verifyWebhook(rawJson, sigHeader)) {
    console.warn('[sign-webhook] signature verification failed for landlord', landlordId)
    return new NextResponse('bad signature', { status: 401 })
  }

  const event = esign.parseWebhookEvent(rawJson)

  try {
    switch (event.type) {
      case 'signature_request_all_signed':
      case 'signature_request_signed':
        await handleAllSigned(event.signatureRequestId, landlordId, esign)
        break
      case 'signature_request_declined':
        await markStatus(event.signatureRequestId, 'declined')
        break
      case 'signature_request_canceled':
        await markStatus(event.signatureRequestId, 'expired')
        break
      case 'template_created':
        // Already stored at template draft creation time. Logging only.
        console.log('[sign-webhook] template_created:', event.templateId)
        break
      default:
        // Many provider events (account.confirmed etc.) aren't relevant.
        // Still ack so they stop retrying.
        break
    }
  } catch (err) {
    console.error('[sign-webhook] handler error for', event.type, err)
    return new NextResponse('handler error', { status: 500 })
  }

  return new NextResponse('ok', { status: 200 })
}

async function markStatus(signatureRequestId: string | undefined, status: string) {
  if (!signatureRequestId) return
  await supabaseAdmin
    .from('lease_signatures')
    .update({ status })
    .eq('signature_request_id', signatureRequestId)
}

async function handleAllSigned(
  signatureRequestId: string | undefined,
  landlordId: string,
  esign: Awaited<ReturnType<typeof esignForLandlord>>,
) {
  if (!signatureRequestId) return

  const { data: sig, error } = await supabaseAdmin
    .from('lease_signatures')
    .select('id')
    .eq('signature_request_id', signatureRequestId)
    .single()

  if (error || !sig) {
    console.warn('[sign-webhook] no lease_signatures row for', signatureRequestId)
    return
  }

  const { pdfBytes } = await esign.downloadSignedFile(signatureRequestId)

  // signed-leases bucket layout: {landlord_id}/{signature_id}.pdf
  // The landlord folder is the same one the storage RLS policy uses.
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
      tenant_sign_url: null,
      tenant_sign_url_expires_at: null,
    })
    .eq('id', sig.id)
}
