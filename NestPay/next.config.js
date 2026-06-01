/** @type {import('next').NextConfig} */

// H5: security headers. The non-CSP headers are enforced (low breakage risk).
// CSP is shipped as Content-Security-Policy-Report-Only — it CANNOT break the
// site, only reports violations to the browser console — because this app
// relies heavily on inline styles (style={{}} attributes + inline <style>
// blocks) and Next.js injects inline hydration scripts, so a strict enforced
// CSP without a nonce pipeline would break rendering. Watch the console for
// violations during onboarding, then flip Report-Only -> enforced by renaming
// the header key to 'Content-Security-Policy' once it's clean. A real
// nonce-based CSP is a follow-up.
const ContentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval' required by Next hydration + Stripe.js until
  // we add nonces. js.stripe.com hosts Stripe Elements.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  // inline styles + Google Fonts stylesheet
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  // Supabase REST + realtime, Stripe API
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  // Stripe Elements / 3DS iframes
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  // 2 years, subdomains included. (No `preload` — that's an irreversible
  // commitment; add it once you're sure every subdomain is HTTPS-only.)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Report-only: observe, don't block. Rename to 'Content-Security-Policy' to enforce.
  { key: 'Content-Security-Policy-Report-Only', value: ContentSecurityPolicy },
]

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['stripe'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
module.exports = nextConfig
