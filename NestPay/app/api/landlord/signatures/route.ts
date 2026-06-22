import { NextRequest, NextResponse } from 'next/server'
import { esignForLandlord, ESignNotConnectedError } from '@/lib/esign'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireLandlord } from '@/lib/auth'

// Assigns a document to a tenant AND initiates the signature request with
// the e-sign provider in one step. Replaces the previous client-side
// direct insert into lease_signatures.
//
// Why server-side: creating the Dropbox Sign signature request needs the
// API key (server-only) and needs to pre-fill merge field values from
// tenant data (rent, unit, dates). We do that here so the tenant has a
// ready-to-sign document the moment the landlord clicks Assign.
//
// Body: { documentId: string, tenantId: string, requiredForMoveIn: boolean }

export async function POST(req: NextRequest) {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response

  const body = await req.json().catch(() => null)
  const documentId = body?.documentId
  const tenantId = body?.tenantId
  const requiredForMoveIn = body?.requiredForMoveIn !== false
  if (!documentId || !tenantId) {
    return NextResponse.json({ error: 'documentId and tenantId required' }, { status: 400 })
  }

  // Verify landlord owns both the document and the tenant.
  const { data: doc } = await supabaseAdmin
    .from('lease_documents')
    .select('id, landlord_id, name, file_path, template_id, provider')
    .eq('id', documentId)
    .single()
  if (!doc || doc.landlord_id !== auth.landlordId) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select(`
      id,
      full_name,
      email,
      lease_start_date,
      lease_end_date,
      units:unit_id (
        unit_number,
        monthly_rent,
        security_deposit_amount,
        properties:property_id ( landlord_id, name, address )
      )
    `)
    .eq('id', tenantId)
    .single()
  const tenantLandlordId = (tenant as any)?.units?.properties?.landlord_id
  if (!tenant || tenantLandlordId !== auth.landlordId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Build merge field values from tenant + unit data. Only used if the
  // document has a template (i.e. landlord set up merge fields).
  const unit = (tenant as any).units
  const property = unit?.properties
  const fieldValues: Record<string, string> = {
    tenant_name: tenant.full_name ?? '',
    tenant_email: (tenant as any).email ?? '',
    unit_number: unit?.unit_number ?? '',
    property_name: property?.name ?? '',
    property_address: property?.address ?? '',
    monthly_rent: unit?.monthly_rent != null ? String(unit.monthly_rent) : '',
    security_deposit: unit?.security_deposit_amount != null ? String(unit.security_deposit_amount) : '',
    lease_start: (tenant as any).lease_start_date ?? '',
    lease_end: (tenant as any).lease_end_date ?? '',
  }

  // Insert the lease_signatures row first so we have an id to reference
  // even if the provider call fails. Status stays 'pending' until the
  // request is successfully created at the provider.
  const { data: sigRow, error: insErr } = await supabaseAdmin
    .from('lease_signatures')
    .insert({
      tenant_id: tenantId,
      document_id: documentId,
      required_for_move_in: requiredForMoveIn,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insErr || !sigRow) {
    // Most common cause: unique (tenant_id, document_id) — already assigned
    return NextResponse.json(
      { error: insErr?.message?.includes('duplicate') ? 'Already assigned' : 'Could not assign' },
      { status: 409 },
    )
  }

  // If the doc has no template yet, we still need a signed URL so the
  // provider can fetch the raw file when creating the request.
  let fileUrl: string | null = null
  if (!doc.template_id) {
    const { data: signed } = await supabaseAdmin.storage
      .from('lease-documents')
      .createSignedUrl(doc.file_path, 15 * 60)
    fileUrl = signed?.signedUrl ?? null
  }

  try {
    const esign = await esignForLandlord(auth.landlordId)
    const { signatureRequestId, initialSignUrl } = await esign.createSignatureRequest({
      templateId: doc.template_id,
      fileUrl,
      title: doc.name,
      signer: {
        name: tenant.full_name ?? 'Tenant',
        email: (tenant as any).email ?? '',
        role: 'Tenant',
      },
      fieldValues: doc.template_id ? fieldValues : undefined,
    })

    // SignWell returns the embedded sign URL synchronously at creation
    // time — cache it on the row so the tenant's Sign click is instant.
    // Providers that don't (e.g. Dropbox Sign) leave initialSignUrl null
    // and the portal falls back to /api/tenant/signatures/[id]/sign-url.
    await supabaseAdmin
      .from('lease_signatures')
      .update({
        signature_request_id: signatureRequestId,
        status: 'awaiting_signature',
        tenant_sign_url: initialSignUrl?.signUrl ?? null,
        tenant_sign_url_expires_at: initialSignUrl?.expiresAt.toISOString() ?? null,
      })
      .eq('id', sigRow.id)

    return NextResponse.json({ id: sigRow.id, signatureRequestId })
  } catch (err: any) {
    if (err instanceof ESignNotConnectedError) {
      // Tear down the pending row so the assignment isn't half-committed.
      await supabaseAdmin.from('lease_signatures').delete().eq('id', sigRow.id)
      return NextResponse.json(
        { error: 'Connect SignWell first in Settings before assigning documents.', code: 'esign_not_connected' },
        { status: 412 },
      )
    }
    console.error('[landlord/signatures] provider error:', err)
    // Leave the row in 'pending' state so the landlord can retry; surface
    // the underlying error in the response body for debugging.
    return NextResponse.json(
      { id: sigRow.id, error: err?.message ?? 'Provider error', code: 'provider_error' },
      { status: 502 },
    )
  }
}
