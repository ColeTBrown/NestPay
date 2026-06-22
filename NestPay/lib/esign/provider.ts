// Abstract e-signature provider interface.
//
// Every concrete provider (Dropbox Sign, DocuSign, etc.) implements this
// surface. The rest of the app — API routes, webhook handler, the
// dashboard "Setup merge fields" button, the portal sign button — only
// talks to this interface, never to a specific provider's SDK.
//
// Adding a new provider = creating one new file under lib/esign/ and
// wiring it into lib/esign/index.ts. No other code changes.
//
// Design notes:
//   - "Template" = a reusable PDF the landlord has dragged merge fields
//     onto (e.g. {{tenant_name}}, {{monthly_rent}}). Templates are
//     created via the embedded editor and then referenced by id when
//     creating signature requests.
//   - "Signature request" = one tenant signing one document. Created
//     either from a template (preferred, supports merge fields) or
//     from a raw PDF (fallback, no merge fields).
//   - "Embedded" everywhere = the iframe stays inside Rentidge; the
//     tenant never sees the provider's domain.

export type ESignProviderName = 'signwell' | 'dropbox_sign' | 'docusign'

export type TemplateField = {
  name: string // matches placeholder in PDF, e.g. 'tenant_name'
  label: string // shown to landlord in the editor
  type: 'text' | 'date' | 'checkbox' | 'signature'
}

export type CreateTemplateInput = {
  fileUrl: string // public-ish signed URL to the PDF in Supabase Storage
  title: string
  signerRole: string // e.g. 'Tenant' — what the role is called in the template
  /** Optional pre-suggested merge fields. Landlord can still add/remove in the editor. */
  fields?: TemplateField[]
}

export type CreateTemplateResult = {
  templateId: string
  editUrl: string
  expiresAt: Date
}

export type CreateSignatureRequestInput = {
  /** Set when a template exists for this document; null = sign-as-is */
  templateId: string | null
  /** Required if templateId is null */
  fileUrl: string | null
  title: string
  signer: {
    name: string
    email: string
    /** Required for templates — must match the signer role in the template */
    role?: string
  }
  /** Merge field values, keyed by field name. Only used with templates. */
  fieldValues?: Record<string, string | number | boolean>
}

export type CreateSignatureRequestResult = {
  signatureRequestId: string
  signerId: string
  /**
   * Some providers (SignWell) return the embedded sign URL synchronously
   * at creation time; others (Dropbox Sign) require a separate call to
   * mint a short-lived URL. When present, the caller should cache this
   * on the row instead of immediately calling getEmbeddedSignUrl().
   */
  initialSignUrl?: { signUrl: string; expiresAt: Date } | null
}

export type EmbeddedSignUrlResult = {
  signUrl: string
  expiresAt: Date
}

export type DownloadedSignedFile = {
  pdfBytes: Buffer
  auditTrailBytes: Buffer | null // some providers bundle the audit cert into the PDF
}

export type WebhookEventType =
  | 'signature_request_signed' // a single signer finished
  | 'signature_request_all_signed' // every signer finished — file ready to download
  | 'signature_request_declined'
  | 'signature_request_canceled'
  | 'template_created'
  | 'other' // anything we don't care about

export type WebhookEvent = {
  type: WebhookEventType
  signatureRequestId?: string
  templateId?: string
  /** Raw provider event for debugging */
  raw: unknown
}

export interface ESignProvider {
  name: ESignProviderName

  createTemplate(input: CreateTemplateInput): Promise<CreateTemplateResult>

  createSignatureRequest(input: CreateSignatureRequestInput): Promise<CreateSignatureRequestResult>

  /** Embedded sign URL for the tenant — short-lived (~5 min) iframe src. */
  getEmbeddedSignUrl(signerId: string): Promise<EmbeddedSignUrlResult>

  /** Downloads the fully-signed PDF + audit trail bytes for storage. */
  downloadSignedFile(signatureRequestId: string): Promise<DownloadedSignedFile>

  /** Returns true if the webhook signature checks out. */
  verifyWebhook(rawBody: string, signatureHeader: string | null): boolean

  parseWebhookEvent(rawBody: string): WebhookEvent
}
