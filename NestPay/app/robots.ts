import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.rentidge.com'

// Dynamic robots.txt at /robots.txt. Disallows the authenticated app surface
// (auth, dashboard, portal, all API routes) so Google doesn't waste crawl
// budget on pages it can't actually access. Allows everything else.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/auth', '/dashboard', '/portal', '/api/', '/sales'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
