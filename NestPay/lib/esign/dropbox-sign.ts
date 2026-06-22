import * as DropboxSign from '@dropbox/sign'
import crypto from 'crypto'
import type {
  ESignProvider,
  CreateTemplateInput,
  CreateTemplateResult,
  CreateSignatureRequestInput,
  CreateSignatureRequestResult,
  EmbeddedSignUrlResult,
  DownloadedSignedFile,
  WebhookEvent,
  WebhookEventType,
} from './provider'

// Dropbox Sign implementation of the ESignProvider interface.
//
// Required env:
//   DROPBOX_SIGN_API_KEY    — server-side API key (Settings → API)
//   DROPBOX_SIGN_CLIENT_ID  — embedded signing client id (Settings → API → API App)
//
// The client id is *only* used for embedded flows (template editor + sign
// widget). The API key alone is enough for server-to-server calls.

function apiKey(): string {
  const key = process.env.DROPBOX_SIGN_API_KEY
  if (!key) throw new Error('DROPBOX_SIGN_API_KEY is not set')
  return key
}

function clientId(): string {
  const id = process.env.DROPBOX_SIGN_CLIENT_ID
  if (!id) throw new Error('DROPBOX_SIGN_CLIENT_ID is not set')
  return id
}

// Test mode is on in any non-production environment. Lets us iterate
// without burning real Dropbox Sign quota or producing legally-binding
// signatures during dev.
function testMode(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.DROPBOX_SIGN_TEST_MODE === 'true'
}

function withAuth<T extends { username: string }>(api: T): T {
  api.username = apiKey()
  return api
}

export const dropboxSignProvider: ESignProvider = {
  name: 'dropbox_sign',

  async createTemplate(input: CreateTemplateInput): Promise<CreateTemplateResult> {
    const api = withAuth(new DropboxSign.TemplateApi())

    const mergeFields: DropboxSign.SubMergeField[] = (input.fields ?? []).map(f => {
      const m = new DropboxSign.SubMergeField()
      m.name = f.name
      m.type =
        f.type === 'date'
          ? DropboxSign.SubMergeField.TypeEnum.Text // Dropbox Sign treats dates as text fields with date-style validation in the editor
          : DropboxSign.SubMergeField.TypeEnum.Text
      return m
    })

    const role = new DropboxSign.SubTemplateRole()
    role.name = input.signerRole
    role.order = 0

    const req: DropboxSign.TemplateCreateEmbeddedDraftRequest = {
      clientId: clientId(),
      title: input.title,
      fileUrls: [input.fileUrl],
      signerRoles: [role],
      mergeFields: mergeFields.length > 0 ? mergeFields : undefined,
      testMode: testMode(),
    } as DropboxSign.TemplateCreateEmbeddedDraftRequest

    const { body } = await api.templateCreateEmbeddedDraft(req)
    const template = body.template
    if (!template?.templateId || !template.editUrl) {
      throw new Error('Dropbox Sign returned an incomplete template draft response')
    }
    return {
      templateId: template.templateId,
      editUrl: template.editUrl,
      expiresAt: new Date((template.expiresAt ?? Date.now() / 1000 + 24 * 3600) * 1000),
    }
  },

  async createSignatureRequest(input: CreateSignatureRequestInput): Promise<CreateSignatureRequestResult> {
    const api = withAuth(new DropboxSign.SignatureRequestApi())

    if (input.templateId) {
      const signer = new DropboxSign.SubSignatureRequestTemplateSigner()
      signer.role = input.signer.role || 'Tenant'
      signer.name = input.signer.name
      signer.emailAddress = input.signer.email

      const customFields: DropboxSign.SubCustomField[] = Object.entries(input.fieldValues ?? {}).map(([name, value]) => {
        const f = new DropboxSign.SubCustomField()
        f.name = name
        f.value = String(value)
        return f
      })

      const req: DropboxSign.SignatureRequestCreateEmbeddedWithTemplateRequest = {
        clientId: clientId(),
        templateIds: [input.templateId],
        signers: [signer],
        customFields: customFields.length > 0 ? customFields : undefined,
        title: input.title,
        testMode: testMode(),
      } as DropboxSign.SignatureRequestCreateEmbeddedWithTemplateRequest

      const { body } = await api.signatureRequestCreateEmbeddedWithTemplate(req)
      const sr = body.signatureRequest
      const sig = sr?.signatures?.[0]
      if (!sr?.signatureRequestId || !sig?.signatureId) {
        throw new Error('Dropbox Sign returned an incomplete signature request response')
      }
      return { signatureRequestId: sr.signatureRequestId, signerId: sig.signatureId }
    }

    // No template — sign the file as-is, no merge fields.
    if (!input.fileUrl) {
      throw new Error('Either templateId or fileUrl is required to create a signature request')
    }

    const signer = new DropboxSign.SubSignatureRequestSigner()
    signer.name = input.signer.name
    signer.emailAddress = input.signer.email
    signer.order = 0

    const req: DropboxSign.SignatureRequestCreateEmbeddedRequest = {
      clientId: clientId(),
      title: input.title,
      signers: [signer],
      fileUrls: [input.fileUrl],
      testMode: testMode(),
    } as DropboxSign.SignatureRequestCreateEmbeddedRequest

    const { body } = await api.signatureRequestCreateEmbedded(req)
    const sr = body.signatureRequest
    const sig = sr?.signatures?.[0]
    if (!sr?.signatureRequestId || !sig?.signatureId) {
      throw new Error('Dropbox Sign returned an incomplete signature request response')
    }
    return { signatureRequestId: sr.signatureRequestId, signerId: sig.signatureId }
  },

  async getEmbeddedSignUrl(signerId: string): Promise<EmbeddedSignUrlResult> {
    const api = withAuth(new DropboxSign.EmbeddedApi())
    const { body } = await api.embeddedSignUrl(signerId)
    const embedded = body.embedded
    if (!embedded?.signUrl) {
      throw new Error('Dropbox Sign did not return an embedded sign URL')
    }
    return {
      signUrl: embedded.signUrl,
      expiresAt: new Date((embedded.expiresAt ?? Date.now() / 1000 + 300) * 1000),
    }
  },

  async downloadSignedFile(signatureRequestId: string): Promise<DownloadedSignedFile> {
    const api = withAuth(new DropboxSign.SignatureRequestApi())
    // Returns a Buffer of the combined PDF (signed copy + audit cert).
    const res = await api.signatureRequestFiles(signatureRequestId, 'pdf')
    const buf = res.body as unknown as Buffer
    return { pdfBytes: Buffer.isBuffer(buf) ? buf : Buffer.from(buf as any), auditTrailBytes: null }
  },

  verifyWebhook(rawBody: string, _signatureHeader: string | null): boolean {
    // Dropbox Sign sends events as multipart/form-data with one field
    // "json" containing the event payload. The event_hash is HMAC SHA-256
    // of (event_time + event_type) signed with the API key.
    try {
      const parsed = JSON.parse(rawBody)
      const eventTime = parsed?.event?.event_time
      const eventType = parsed?.event?.event_type
      const eventHash = parsed?.event?.event_hash
      if (!eventTime || !eventType || !eventHash) return false
      const expected = crypto
        .createHmac('sha256', apiKey())
        .update(`${eventTime}${eventType}`)
        .digest('hex')
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(eventHash))
    } catch {
      return false
    }
  },

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const parsed = JSON.parse(rawBody)
    const dropboxType: string = parsed?.event?.event_type ?? ''
    const map: Record<string, WebhookEventType> = {
      signature_request_signed: 'signature_request_signed',
      signature_request_all_signed: 'signature_request_all_signed',
      signature_request_declined: 'signature_request_declined',
      signature_request_canceled: 'signature_request_canceled',
      template_created: 'template_created',
    }
    const type: WebhookEventType = map[dropboxType] ?? 'other'
    return {
      type,
      signatureRequestId: parsed?.signature_request?.signature_request_id,
      templateId: parsed?.template?.template_id,
      raw: parsed,
    }
  },
}
