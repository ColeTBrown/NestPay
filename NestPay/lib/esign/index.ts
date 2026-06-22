import type { ESignProvider, ESignProviderName } from './provider'
import { signwellProvider } from './signwell'

// Active e-sign provider. For v1, every document uses SignWell —
// chosen over Dropbox Sign for the ~10x cheaper unlimited-API pricing
// ($8/mo vs $99/mo). Both providers offer the same feature set for
// our use case (embedded signing + templates + merge fields + webhooks)
// and both are ESIGN Act / UETA compliant.
//
// To add a second provider (e.g. DocuSign — if a landlord ever
// requires it):
//   1. Create lib/esign/docusign.ts implementing the ESignProvider interface
//   2. Add it to the registry below
//   3. Add a 'esign_provider' column to the profiles table and route via
//      `esignFor(profile.esign_provider)` instead of the default.

const REGISTRY: Partial<Record<ESignProviderName, ESignProvider>> = {
  signwell: signwellProvider,
  // dropbox_sign: ...,  // dropped — code in git history under PR B scaffold commit
  // docusign: ...,      // future, on demand
}

export function esignFor(name?: string | null): ESignProvider {
  const n = (name ?? 'signwell') as ESignProviderName
  const p = REGISTRY[n]
  if (!p) throw new Error(`Unknown e-sign provider: ${name}`)
  return p
}

/** Default provider — what new documents and signatures use unless overridden. */
export const esign: ESignProvider = signwellProvider

export type { ESignProvider, CreateTemplateInput, CreateSignatureRequestInput, WebhookEvent } from './provider'
