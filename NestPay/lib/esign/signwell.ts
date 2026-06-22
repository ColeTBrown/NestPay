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

// SignWell implementation of the ESignProvider interface.
//
// Required env:
//   SIGNWELL_API_KEY      — server-side API key (Settings → API → API keys)
//   SIGNWELL_API_APP_ID   — Embedded Signing API application id (Settings →
//                           API → Applications). Required for embedded flows.
//   SIGNWELL_WEBHOOK_SECRET — separate from the API key; the webhook
//                           HMAC is signed with this. Defaults to the API
//                           key if unset (matches SignWell's older behavior
//                           where webhook id == API key).
//
// API basics:
//   - Base URL: https://www.signwell.com/api/v1
//   - Auth: X-Api-Key header
//   - Embedded signing: include `embedded_signing: true` on create document;
//     response has a per-recipient `embedded_signing_url`.
//   - Webhook signature: payload.event.hash = HMAC-SHA256(stringified event,
//     webhook secret). Lives in the body, not a header.
//
// Differences from Dropbox Sign worth noting:
//   - SignWell uses one "document" call for both embedded + email flows.
//     The embedded_signing flag is what makes it iframe-able.
//   - The embedded sign URL is returned at document creation time, not
//     fetched separately later. We pass it back as initialSignUrl.
//   - SignWell's "embedded editor" for templates uses a different field
//     name (embedded_editor_url) but the concept is identical to
//     Dropbox Sign's embedded template draft.
//   - Webhook secret is a *separate* value from the API key (unlike
//     Dropbox Sign which signs with the API key itself).

const API_BASE = 'https://www.signwell.com/api/v1'

function apiKey(): string {
  const key = process.env.SIGNWELL_API_KEY
  if (!key) throw new Error('SIGNWELL_API_KEY is not set')
  return key
}

function apiAppId(): string {
  const id = process.env.SIGNWELL_API_APP_ID
  if (!id) throw new Error('SIGNWELL_API_APP_ID is not set')
  return id
}

function webhookSecret(): string {
  // Falls back to API key — SignWell's docs show some accounts still use
  // the API key as the webhook signing secret. Override with a dedicated
  // SIGNWELL_WEBHOOK_SECRET if your account uses one.
  return process.env.SIGNWELL_WEBHOOK_SECRET || process.env.SIGNWELL_API_KEY || ''
}

// Test mode is on outside production. Same rationale as the Dropbox Sign
// version: free, watermarked test signatures while iterating.
function testMode(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.SIGNWELL_TEST_MODE === 'true'
}

type SignwellInit = { method?: string; body?: unknown; headers?: Record<string, string> }

async function signwellFetch(path: string, init: SignwellInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'X-Api-Key': apiKey(),
    'Accept': 'application/json',
    ...(init.headers ?? {}),
  }
  let serialized: string | undefined
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    serialized = typeof init.body === 'string' ? init.body : JSON.stringify(init.body)
  }
  const res = await fetch(`${API_BASE}${path}`, { method: init.method, headers, body: serialized })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SignWell ${init.method ?? 'GET'} ${path} -> ${res.status}: ${text || res.statusText}`)
  }
  if (res.status === 204) return null
  const ct = res.headers.get('content-type') ?? ''
  return ct.includes('json') ? res.json() : res.arrayBuffer()
}

export const signwellProvider: ESignProvider = {
  name: 'signwell',

  async createTemplate(input: CreateTemplateInput): Promise<CreateTemplateResult> {
    // SignWell's "embedded editor" lets the landlord drag fields onto
    // their PDF inside an iframe. We seed it with suggested merge fields
    // so they have something to drop in immediately.
    const fields = (input.fields ?? []).map(f => ({
      api_id: f.name,
      name: f.label,
      // SignWell field types: signature, initial, text, checkbox, date_signed, etc.
      type: f.type === 'signature' ? 'signature' : f.type === 'checkbox' ? 'checkbox' : f.type === 'date' ? 'text' : 'text',
      // We don't place them — landlord positions them in the editor.
      required: true,
    }))

    const body = {
      api_application_id: apiAppId(),
      test_mode: testMode(),
      name: input.title,
      embedded_editor: true,
      files: [{ name: input.title, file_url: input.fileUrl }],
      placeholders: [{ name: input.signerRole }],
      fields: fields.length > 0 ? [fields] : undefined, // SignWell expects fields nested per file
    }

    const res = await signwellFetch('/document_templates/', { method: 'POST', body })
    const templateId = res?.id
    const editUrl = res?.embedded_edit_url || res?.embedded_editor_url
    if (!templateId || !editUrl) {
      throw new Error('SignWell returned an incomplete template draft response')
    }
    return {
      templateId,
      editUrl,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    }
  },

  async createSignatureRequest(input: CreateSignatureRequestInput): Promise<CreateSignatureRequestResult> {
    if (input.templateId) {
      // Create document from template — preferred path. Merge field
      // values are passed as template_fields keyed by api_id.
      const templateFields = Object.entries(input.fieldValues ?? {}).map(([api_id, value]) => ({
        api_id,
        value: String(value),
      }))

      const body = {
        api_application_id: apiAppId(),
        test_mode: testMode(),
        embedded_signing: true,
        embedded_signing_notifications: false,
        name: input.title,
        template_ids: [input.templateId],
        recipients: [
          {
            id: '1',
            placeholder_name: input.signer.role || 'Tenant',
            name: input.signer.name,
            email: input.signer.email,
          },
        ],
        template_fields: templateFields,
      }

      const res = await signwellFetch('/document_templates/documents/', { method: 'POST', body })
      return extractCreated(res)
    }

    // No template — embed the raw file. Caller must drop a {{sig}} text
    // tag in the PDF or accept SignWell's default single-signature page.
    if (!input.fileUrl) {
      throw new Error('Either templateId or fileUrl is required to create a signature request')
    }

    const body = {
      api_application_id: apiAppId(),
      test_mode: testMode(),
      embedded_signing: true,
      embedded_signing_notifications: false,
      name: input.title,
      files: [{ name: input.title, file_url: input.fileUrl }],
      recipients: [
        {
          id: '1',
          name: input.signer.name,
          email: input.signer.email,
        },
      ],
    }

    const res = await signwellFetch('/documents/', { method: 'POST', body })
    return extractCreated(res)
  },

  async getEmbeddedSignUrl(signerId: string): Promise<EmbeddedSignUrlResult> {
    // SignWell returns the embedded sign URL at creation time. For
    // refreshes we re-fetch the document and pull the URL from the
    // first recipient. signerId here = document id (we set it that
    // way in createSignatureRequest).
    const doc = await signwellFetch(`/documents/${signerId}/`)
    const url =
      doc?.recipients?.[0]?.embedded_signing_url ??
      doc?.embedded_signing_url
    if (!url) {
      throw new Error('SignWell did not return an embedded sign URL')
    }
    // URLs do expire eventually but SignWell doesn't publish a TTL. Pick
    // a conservative 30-min cache window.
    return { signUrl: url, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
  },

  async downloadSignedFile(signatureRequestId: string): Promise<DownloadedSignedFile> {
    // Returns a PDF stream. Audit cert is appended into the same file
    // (with url_only=false; SignWell's audit_trail page lives in this PDF).
    const res = await fetch(
      `${API_BASE}/documents/${signatureRequestId}/completed_pdf/?url_only=false&audit_page=true`,
      { headers: { 'X-Api-Key': apiKey(), Accept: 'application/pdf' } },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`SignWell download -> ${res.status}: ${text || res.statusText}`)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    return { pdfBytes: buf, auditTrailBytes: null }
  },

  verifyWebhook(rawBody: string, _signatureHeader: string | null): boolean {
    // SignWell signs the event sub-object, not the full body.
    // payload.event.hash = HMAC-SHA256(JSON.stringify(event_without_hash), secret)
    try {
      const payload = JSON.parse(rawBody)
      const event = payload?.event
      if (!event?.hash) return false
      const { hash, ...rest } = event
      const expected = crypto
        .createHmac('sha256', webhookSecret())
        .update(JSON.stringify(rest))
        .digest('hex')
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))
    } catch {
      return false
    }
  },

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const payload = JSON.parse(rawBody)
    const type: string = payload?.event?.type ?? ''
    // SignWell event names → our normalized names. See
    // https://developers.signwell.com/reference/webhook-events
    const map: Record<string, WebhookEventType> = {
      document_completed: 'signature_request_all_signed',
      document_signed: 'signature_request_signed',
      document_declined: 'signature_request_declined',
      document_canceled: 'signature_request_canceled',
      document_template_created: 'template_created',
    }
    const mapped: WebhookEventType = map[type] ?? 'other'
    const data = payload?.data ?? payload
    return {
      type: mapped,
      signatureRequestId: data?.document?.id ?? data?.id,
      templateId: data?.document_template?.id,
      raw: payload,
    }
  },
}

// Helper — both POST /documents and POST /document_templates/documents
// return the same shape. Pull document id + first recipient id + URL.
function extractCreated(res: any): CreateSignatureRequestResult {
  const docId = res?.id
  const recipient = res?.recipients?.[0]
  const signerId = recipient?.id ?? docId
  const signUrl = recipient?.embedded_signing_url ?? res?.embedded_signing_url
  if (!docId) {
    throw new Error('SignWell returned an incomplete create-document response')
  }
  return {
    signatureRequestId: docId,
    // We use docId as the signer id everywhere downstream — getEmbeddedSignUrl
    // looks up the document, not the recipient id. Storing docId here lets
    // the sign-url route refresh against the right resource.
    signerId: docId,
    initialSignUrl: signUrl
      ? { signUrl, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
      : null,
  }
}
