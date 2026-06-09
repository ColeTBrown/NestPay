import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllPostSlugs, getPost } from '@/lib/blog'

const SITE_URL = 'https://www.rentidge.com'

export async function generateStaticParams() {
  return getAllPostSlugs().map(slug => ({ slug }))
}

type Params = { slug: string }

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return {}
  const url = `${SITE_URL}/blog/${post.slug}`
  return {
    title: `${post.title} — Rentidge`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: 'Rentidge',
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      images: post.ogImage ? [{ url: `${SITE_URL}${post.ogImage}` }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.ogImage ? [`${SITE_URL}${post.ogImage}`] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const post = await getPost(params.slug)
  if (!post) notFound()

  const url = `${SITE_URL}/blog/${post.slug}`
  // Article JSON-LD for Google rich results. Worth the extra ~600 bytes per
  // page since Google specifically rewards Article schema for blog content.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Rentidge',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.tags.join(', '),
  }

  return (
    <div className="post-root">
      <style>{`
        .post-root {
          background: #f7f6f3;
          color: #1a1a1a;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }
        .post-nav {
          padding: 18px 48px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid #e8e6e0;
        }
        .post-nav-logo { font-family: 'DM Serif Display', serif; font-size: 22px; color: #1a1a1a; letter-spacing: -0.3px; }
        .post-nav-logo span { color: #38BDF8; }
        .post-nav-links { display: flex; gap: 28px; font-size: 14px; }
        .post-nav-links a { color: #555; text-decoration: none; transition: color 0.2s; }
        .post-nav-links a:hover { color: #1a1a1a; }

        .post-back { max-width: 720px; margin: 0 auto; padding: 32px 48px 0; }
        .post-back a { font-size: 13px; color: #777; text-decoration: none; }
        .post-back a:hover { color: #1a1a1a; }

        .post-header { max-width: 720px; margin: 0 auto; padding: 24px 48px 32px; }
        .post-eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: #999; margin-bottom: 16px; }
        .post-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(34px, 5vw, 52px);
          line-height: 1.1;
          letter-spacing: -1px;
          color: #1a1a1a;
          margin-bottom: 18px;
        }
        .post-byline { font-size: 14px; color: #777; }

        .post-body { max-width: 720px; margin: 0 auto; padding: 16px 48px 80px; }
        .post-body h2 {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          line-height: 1.2;
          letter-spacing: -0.5px;
          margin: 48px 0 16px;
          color: #1a1a1a;
        }
        .post-body h3 {
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 19px;
          margin: 32px 0 12px;
          color: #1a1a1a;
        }
        .post-body p { font-size: 17px; line-height: 1.72; color: #2a2a2a; margin-bottom: 18px; font-weight: 300; }
        .post-body strong { font-weight: 500; color: #1a1a1a; }
        .post-body em { font-style: italic; color: #555; }
        .post-body a { color: #38BDF8; text-decoration: none; border-bottom: 1px solid rgba(56,189,248,0.4); }
        .post-body a:hover { border-bottom-color: #38BDF8; }
        .post-body ul, .post-body ol { padding-left: 24px; margin-bottom: 18px; }
        .post-body li { font-size: 17px; line-height: 1.7; color: #2a2a2a; margin-bottom: 8px; font-weight: 300; }
        .post-body li strong { color: #1a1a1a; }
        .post-body blockquote {
          border-left: 3px solid #38BDF8;
          padding: 8px 0 8px 20px;
          margin: 24px 0;
          color: #555;
          font-style: italic;
        }
        .post-body code {
          background: rgba(15,23,42,0.06);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 14px;
        }
        .post-body hr {
          border: none;
          border-top: 1px solid #e8e6e0;
          margin: 40px 0;
        }
        .post-body table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          margin: 24px 0;
        }
        .post-body th, .post-body td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #e8e6e0;
        }
        .post-body th {
          font-weight: 500;
          color: #1a1a1a;
          background: rgba(15,23,42,0.03);
        }
        .post-body td { color: #555; font-weight: 300; }

        .post-cta {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 48px 80px;
        }
        .post-cta-card {
          background: #1a1a1a;
          color: #f7f6f3;
          border-radius: 16px;
          padding: 36px 32px;
          text-align: center;
        }
        .post-cta-title {
          font-family: 'DM Serif Display', serif;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .post-cta-desc { font-size: 14px; color: rgba(247,246,243,0.7); margin-bottom: 22px; font-weight: 300; }
        .post-cta-btn {
          display: inline-block;
          background: #38BDF8;
          color: #020617;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .post-footer { padding: 32px 48px; border-top: 1px solid #e8e6e0; text-align: center; font-size: 12px; color: #aaa; }

        @media (max-width: 768px) {
          .post-nav, .post-back, .post-header, .post-body, .post-cta, .post-footer {
            padding-left: 24px; padding-right: 24px;
          }
          .post-body p, .post-body li { font-size: 16px; }
        }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="post-nav">
        <Link href="/" className="post-nav-logo">Rent<span>idge</span></Link>
        <div className="post-nav-links">
          <Link href="/">Home</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/auth?mode=signup">Get started</Link>
        </div>
      </nav>

      <div className="post-back">
        <Link href="/blog">← All posts</Link>
      </div>

      <header className="post-header">
        <div className="post-eyebrow">
          {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}
          {post.readingMinutes} min read
        </div>
        <h1 className="post-title">{post.title}</h1>
        <p className="post-byline">By {post.author}</p>
      </header>

      <article className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />

      <div className="post-cta">
        <div className="post-cta-card">
          <div className="post-cta-title">Stop managing rent in spreadsheets</div>
          <p className="post-cta-desc">
            Rentidge handles rent collection, maintenance, and books on autopilot. Free during beta.
          </p>
          <Link href="/auth?mode=signup" className="post-cta-btn">Get started →</Link>
        </div>
      </div>

      <footer className="post-footer">
        © {new Date().getFullYear()} Rentidge. All rights reserved.
      </footer>
    </div>
  )
}
