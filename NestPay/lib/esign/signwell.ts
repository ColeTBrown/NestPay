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
// Factory-shaped (createSignwellProvider) instead of a singleton because
// every landlord brings their own SignWell account (BYO model). Caller
// resolves the landlord's credentials from the profiles row and
// constructs a provider scoped to that landlord. See lib/esign/index.ts
// (esignForLandlord) for the lookup.
//
// API basics:
//   - Base URL: https://www.signwell.com/api/v1
//   - Auth: X-Api-Key header
//   - Embedded signing: include `embedded_signing: true` on create document;
//     response has a per-recipient `embedded_signing_url`.
//   - Webhook signature: payload.event.hash = HMAC-SHA256(stringified event,
//     api key). Lives in the body, not a header. On free/standard tiers
//     SignWell signs with the API key itself; higher tiers may issue a
//     separate webhook secret which we'd accept as an optional credential.

const API_BASE = 'https://www.signwell.com/api/v1'

export type SignwellCredentials = {
  apiKey: string
  apiAppId: string
  /** Optional — defaults to apiKey when SignWell hasn't issued a separate secret. */
  webhookSecret?: string
}

function testMode(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.SIGNWELL_TEST_MODE === 'true'
}

type SignwellInit = { method?: string; body?: unknown; headers?: Record<string, string> }

function makeFetch(creds: SignwellCredentials) {
  return async function signwellFetch(path: string, init: SignwellInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'X-Api-Key': creds.apiKey,
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
}

export function createSignwellProvider(creds: SignwellCredentials): ESignProvider {
  if (!creds.apiKey) throw new Error('SignWell apiKey is required')
  if (!creds.apiAppId) throw new Error('SignWell apiAppId is required')
  const signwellFetch = makeFetch(creds)
  const webhookSecret = creds.webhookSecret || creds.apiKey

  return {
    name: 'signwell',

    async createTemplate(input: CreateTemplateInput): Promise<CreateTemplateResult> {
      const fields = (input.fields ?? []).map(f => ({
        api_id: f.name,
        name: f.label,
        type: f.type === 'signature' ? 'signature' : f.type === 'checkbox' ? 'checkbox' : 'text',
        required: true,
      }))

      const body = {
        api_application_id: creds.apiAppId,
        test_mode: testMode(),
        name: input.title,
        embedded_editor: true,
        files: [{ name: input.title, file_url: input.fileUrl }],
        placeholders: [{ name: input.signerRole }],
        fields: fields.length > 0 ? [fields] : undefined,
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
        const templateFields = Object.entries(input.fieldValues ?? {}).map(([api_id, value]) => ({
          api_id,
          value: String(value),
        }))

        const body = {
          api_application_id: creds.apiAppId,
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

      if (!input.fileUrl) {
        throw new Error('Either templateId or fileUrl is required to create a signature request')
      }

      const body = {
        api_application_id: creds.apiAppId,
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
      const doc = await signwellFetch(`/documents/${signerId}/`)
      const url =
        doc?.recipients?.[0]?.embedded_signing_url ??
        doc?.embedded_signing_url
      if (!url) {
        throw new Error('SignWell did not return an embedded sign URL')
      }
      return { signUrl: url, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
    },

    async downloadSignedFile(signatureRequestId: string): Promise<DownloadedSignedFile> {
      const res = await fetch(
        `${API_BASE}/documents/${signatureRequestId}/completed_pdf/?url_only=false&audit_page=true`,
        { headers: { 'X-Api-Key': creds.apiKey, Accept: 'application/pdf' } },
      )
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`SignWell download -> ${res.status}: ${text || res.statusText}`)
      }
      const buf = Buffer.from(await res.arrayBuffer())
      return { pdfBytes: buf, auditTrailBytes: null }
    },

    verifyWebhook(rawBody: string, _signatureHeader: string | null): boolean {
      try {
        const payload = JSON.parse(rawBody)
        const event = payload?.event
        if (!event?.hash) return false
        const { hash, ...rest } = event
        const expected = crypto
          .createHmac('sha256', webhookSecret)
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
}

function extractCreated(res: any): CreateSignatureRequestResult {
  const docId = res?.id
  const signUrl = res?.recipients?.[0]?.embedded_signing_url ?? res?.embedded_signing_url
  if (!docId) {
    throw new Error('SignWell returned an incomplete create-document response')
  }
  return {
    signatureRequestId: docId,
    // We use docId as the signer id everywhere downstream — getEmbeddedSignUrl
    // looks up the document, not the recipient id.
    signerId: docId,
    initialSignUrl: signUrl
      ? { signUrl, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
      : null,
  }
}

/**
 * Lightweight credential check — calls SignWell's /me endpoint to verify
 * the API key is valid before persisting it. Used by the "Test connection"
 * button on the dashboard settings page.
 */
export async function pingSignwell(creds: SignwellCredentials): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  try {
    const fetcher = makeFetch(creds)
    const me = await fetcher('/me/')
    return { ok: true, email: me?.email ?? me?.account?.email ?? '' }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}
