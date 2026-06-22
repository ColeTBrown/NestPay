import { NextRequest, NextResponse } from 'next/server'
import { esignForLandlord, ESignNotConnectedError } from '@/lib/esign'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireLandlord } from '@/lib/auth'

// Initiates the embedded template editor for a library document.
// The landlord drags merge fields onto their uploaded PDF inside an
// iframe rendered by the e-sign provider's JS SDK on the dashboard.
//
// Returns: { editUrl, templateId }

const FIELD_SUGGESTIONS = [
  { name: 'tenant_name', label: 'Tenant name', type: 'text' as const },
  { name: 'tenant_email', label: 'Tenant email', type: 'text' as const },
  { name: 'unit_number', label: 'Unit number', type: 'text' as const },
  { name: 'property_name', label: 'Property name', type: 'text' as const },
  { name: 'monthly_rent', label: 'Monthly rent', type: 'text' as const },
  { name: 'security_deposit', label: 'Security deposit', type: 'text' as const },
  { name: 'lease_start', label: 'Lease start date', type: 'date' as const },
  { name: 'lease_end', label: 'Lease end date', type: 'date' as const },
]

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireLandlord()
  if ('response' in auth) return auth.response

  const docId = params.id

  const { data: doc, error } = await supabaseAdmin
    .from('lease_documents')
    .select('id, landlord_id, name, file_path, template_id')
    .eq('id', docId)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }
  if (doc.landlord_id !== auth.landlordId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (doc.template_id) {
    return NextResponse.json(
      { error: 'Template already set up — edit it from your SignWell dashboard', templateId: doc.template_id },
      { status: 409 },
    )
  }

  // Generate a short-lived signed URL the provider can fetch the PDF from.
  // 15 minutes is plenty for them to download once.
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from('lease-documents')
    .createSignedUrl(doc.file_path, 15 * 60)

  if (signErr || !signed?.signedUrl) {
    console.error('[landlord/template] signed URL error:', signErr)
    return NextResponse.json({ error: 'Could not generate file URL' }, { status: 500 })
  }

  try {
    const esign = await esignForLandlord(auth.landlordId)
    const { templateId, editUrl } = await esign.createTemplate({
      fileUrl: signed.signedUrl,
      title: doc.name,
      signerRole: 'Tenant',
      fields: FIELD_SUGGESTIONS,
    })

    await supabaseAdmin
      .from('lease_documents')
      .update({ template_id: templateId })
      .eq('id', docId)

    return NextResponse.json({ editUrl, templateId })
  } catch (err: any) {
    if (err instanceof ESignNotConnectedError) {
      return NextResponse.json(
        { error: 'Connect SignWell first in Settings before setting up merge fields.', code: 'esign_not_connected' },
        { status: 412 },
      )
    }
    console.error('[landlord/template] provider error:', err)
    return NextResponse.json({ error: err?.message ?? 'Provider error' }, { status: 502 })
  }
}
