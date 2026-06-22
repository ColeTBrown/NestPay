import type { ESignProvider, ESignProviderName } from './provider'
import { createSignwellProvider } from './signwell'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Per-landlord e-signature provider resolution.
//
// Each landlord brings their own SignWell account (BYO model). This
// keeps Rentidge as pure infrastructure rather than the legal sender
// on every signature request — the audit trail lives in the landlord's
// account, billing is the landlord's responsibility, and the
// landlord-tenant signing relationship is direct.
//
// Lookup pattern:
//   const esign = await esignForLandlord(landlordId)
//   await esign.createSignatureRequest(...)
//
// Throws ESignNotConnectedError when the landlord hasn't completed
// the connection flow yet — callers should catch this and respond
// with a "Connect e-signature provider first" gate.

export class ESignNotConnectedError extends Error {
  constructor(public landlordId: string) {
    super(`Landlord ${landlordId} has not connected an e-signature provider`)
    this.name = 'ESignNotConnectedError'
  }
}

/**
 * Resolve the e-sign provider for a given landlord. Today this always
 * returns a SignWell instance; if/when we add DocuSign as a second
 * provider, we'd read a `profiles.esign_provider` column to choose.
 */
export async function esignForLandlord(landlordId: string): Promise<ESignProvider> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('signwell_api_key, signwell_api_app_id')
    .eq('id', landlordId)
    .single()

  if (error || !data?.signwell_api_key || !data?.signwell_api_app_id) {
    throw new ESignNotConnectedError(landlordId)
  }

  return createSignwellProvider({
    apiKey: data.signwell_api_key,
    apiAppId: data.signwell_api_app_id,
  })
}

/**
 * Same as esignForLandlord but accepts raw credentials directly.
 * Used by the webhook receiver (which already has the credentials
 * loaded from the landlord-id URL parameter) and the connection
 * test flow on the settings page.
 */
export function esignForCredentials(creds: { apiKey: string; apiAppId: string; webhookSecret?: string }): ESignProvider {
  return createSignwellProvider(creds)
}

export type { ESignProvider, CreateTemplateInput, CreateSignatureRequestInput, WebhookEvent } from './provider'
export type { ESignProviderName }
