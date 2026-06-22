// Thin client-side helper around hellosign-embedded.
//
// Why a wrapper: we want a single place to define the test-mode flag,
// event handling, and cleanup so every call site (dashboard merge-fields
// setup + portal sign widget) doesn't repeat the same boilerplate.
//
// This only runs in the browser. Server code must not import it.

'use client'

// hellosign-embedded touches `window` at module evaluation, so we import
// it dynamically on first use rather than at the top of the file. This
// keeps the module safe to import from server-rendered components.

type OpenOpts = {
  url: string
  clientId: string
  /** Pass true when running against a Dropbox Sign sandbox / dev account */
  testMode?: boolean
  onFinish?: () => void
  onCancel?: () => void
  onError?: (err: unknown) => void
}

let activeClient: any = null

export async function openEmbedded({ url, clientId, testMode = true, onFinish, onCancel, onError }: OpenOpts) {
  // Tear down any previous instance so events don't double-fire.
  if (activeClient) {
    try { activeClient.close() } catch {}
    activeClient = null
  }

  // Dynamic import — the SDK references `window` at top level and would
  // break server-side rendering if imported statically.
  const HelloSign = (await import('hellosign-embedded')).default
  const client: any = new HelloSign({ clientId })
  activeClient = client

  // The SDK fires different events for sign vs. template create.
  // We map them both to onFinish.
  client.on('sign', () => onFinish?.())
  client.on('createTemplate', () => onFinish?.())
  client.on('cancel', () => onCancel?.())
  client.on('error', (e: any) => onError?.(e))
  client.on('close', () => {
    if (activeClient === client) activeClient = null
  })

  client.open(url, {
    testMode,
    skipDomainVerification: testMode,
  })
}

export function closeEmbedded() {
  if (activeClient) {
    try { activeClient.close() } catch {}
    activeClient = null
  }
}
