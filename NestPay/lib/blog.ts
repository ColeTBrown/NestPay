import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'
import readingTime from 'reading-time'

// Markdown-backed blog. Posts live in /content/blog/*.md with frontmatter.
// Read once at build time and cached — every blog page is statically
// generated, which is what we want for SEO.

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string // ISO YYYY-MM-DD
  author: string
  tags: string[]
  readingMinutes: number
  /** Optional canonical OG image absolute path under /public, e.g. "/og/post-slug.png" */
  ogImage?: string
}

export type BlogPost = BlogPostMeta & {
  html: string
}

function readPostFile(slug: string): { meta: BlogPostMeta; markdown: string } {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  const rt = readingTime(content)
  const meta: BlogPostMeta = {
    slug,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    date: String(data.date ?? ''),
    author: String(data.author ?? 'Rentidge'),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingMinutes: Math.max(1, Math.round(rt.minutes)),
    ogImage: data.ogImage ? String(data.ogImage) : undefined,
  }
  return { meta, markdown: content }
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
}

export function getAllPosts(): BlogPostMeta[] {
  return getAllPostSlugs()
    .map(slug => readPostFile(slug).meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1)) // newest first
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const { meta, markdown } = readPostFile(slug)
    const html = await marked.parse(markdown, { gfm: true, breaks: false })
    return { ...meta, html }
  } catch {
    return null
  }
}
