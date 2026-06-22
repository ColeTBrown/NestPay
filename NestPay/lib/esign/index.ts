import type { ESignProvider, ESignProviderName } from './provider'
import { dropboxSignProvider } from './dropbox-sign'

// Active e-sign provider. For v1, every document uses Dropbox Sign.
//
// To add a second provider (e.g. DocuSign):
//   1. Create lib/esign/docusign.ts implementing the ESignProvider interface
//   2. Add it to the registry below
//   3. Add a 'esign_provider' column to the profiles table and route via
//      `providerFor(profile.esign_provider)` instead of the default.
//
// Until then, this exports a singleton that's used by every API route.

const REGISTRY: Partial<Record<ESignProviderName, ESignProvider>> = {
  dropbox_sign: dropboxSignProvider,
  // docusign: docusignProvider,  // future
}

export function esignFor(name?: string | null): ESignProvider {
  const n = (name ?? 'dropbox_sign') as ESignProviderName
  const p = REGISTRY[n]
  if (!p) throw new Error(`Unknown e-sign provider: ${name}`)
  return p
}

/** Default provider — what new documents and signatures use unless overridden. */
export const esign: ESignProvider = dropboxSignProvider

export type { ESignProvider, CreateTemplateInput, CreateSignatureRequestInput, WebhookEvent } from './provider'
