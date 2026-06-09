import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'

const SITE_URL = 'https://www.rentidge.com'

// Dynamic sitemap. Next.js serves this at /sitemap.xml automatically.
// Includes the marketing surface (home + blog) and every published post.
// Auth/dashboard/portal routes are intentionally excluded — they're private
// and shouldn't appear in search results.

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()
  const posts = getAllPosts()

  return [
    { url: `${SITE_URL}/`,      lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/blog`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    ...posts.map(post => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.date,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
