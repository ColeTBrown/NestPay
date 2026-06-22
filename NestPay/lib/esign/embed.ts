'use client'

// Client-side helper for opening SignWell's embedded signing iframe.
//
// SignWell ships a tiny JS library at https://static.signwell.com/assets/embedded.js
// that exposes a global `SignWellEmbed` class. We load it on demand the
// first time openEmbedded() is called so we don't add a script tag to
// every page.

const SDK_URL = 'https://static.signwell.com/assets/embedded.js'

declare global {
  interface Window {
    SignWellEmbed?: any
  }
}

let sdkPromise: Promise<any> | null = null

function loadSdk(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Server-side'))
  if (window.SignWellEmbed) return Promise.resolve(window.SignWellEmbed)
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => {
      if (window.SignWellEmbed) resolve(window.SignWellEmbed)
      else reject(new Error('SignWell SDK loaded but global is missing'))
    }
    script.onerror = () => reject(new Error('Failed to load SignWell embedded SDK'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

type OpenOpts = {
  url: string
  /** Unused for SignWell — kept for API parity with other providers. */
  clientId?: string
  /** Unused for SignWell — test mode is decided by the document itself. */
  testMode?: boolean
  onFinish?: () => void
  onCancel?: () => void
  onError?: (err: unknown) => void
}

let activeWidget: any = null

export async function openEmbedded({ url, onFinish, onCancel, onError }: OpenOpts) {
  if (activeWidget) {
    try { activeWidget.close() } catch {}
    activeWidget = null
  }

  try {
    const SignWellEmbed = await loadSdk()
    activeWidget = new SignWellEmbed({
      url,
      events: {
        completed: () => onFinish?.(),
        // SignWell also fires `signed` for in-progress signers in a
        // multi-signer flow. We only have single-signer flows so far,
        // so both events should be treated as finished.
        signed: () => onFinish?.(),
        declined: () => onCancel?.(),
        closed: () => onCancel?.(),
        error: (e: any) => onError?.(e),
      },
    })
    activeWidget.open()
  } catch (err) {
    onError?.(err)
  }
}

export function closeEmbedded() {
  if (activeWidget) {
    try { activeWidget.close() } catch {}
    activeWidget = null
  }
}
