import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog — Rentidge',
  description:
    "Practical guides for small landlords: rent collection, security deposits, switching from spreadsheets, property management software, and more.",
  alternates: { canonical: 'https://www.rentidge.com/blog' },
  openGraph: {
    title: 'Rentidge Blog — Guides for small landlords',
    description:
      "Practical guides for small landlords: rent collection, security deposits, switching from spreadsheets, and more.",
    url: 'https://www.rentidge.com/blog',
    siteName: 'Rentidge',
    type: 'website',
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  return (
    <div className="blog-root">
      <style>{`
        .blog-root {
          background: #f7f6f3;
          color: #1a1a1a;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }
        .blog-nav {
          padding: 18px 48px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid #e8e6e0;
        }
        .blog-nav-logo { font-family: 'DM Serif Display', serif; font-size: 22px; color: #1a1a1a; letter-spacing: -0.3px; }
        .blog-nav-logo span { color: #38BDF8; }
        .blog-nav-links { display: flex; gap: 28px; font-size: 14px; }
        .blog-nav-links a { color: #555; text-decoration: none; transition: color 0.2s; }
        .blog-nav-links a:hover { color: #1a1a1a; }
        .blog-header { max-width: 900px; margin: 0 auto; padding: 80px 48px 48px; }
        .blog-eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: #999; margin-bottom: 16px; }
        .blog-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(40px, 6vw, 64px);
          line-height: 1.05;
          letter-spacing: -1.5px;
          color: #1a1a1a;
          margin-bottom: 18px;
        }
        .blog-sub {
          font-size: 17px;
          font-weight: 300;
          color: #555;
          max-width: 620px;
          line-height: 1.6;
        }
        .blog-list { max-width: 900px; margin: 0 auto; padding: 0 48px 120px; }
        .post-card {
          display: block;
          padding: 32px 0;
          border-bottom: 1px solid #e8e6e0;
          text-decoration: none;
          color: inherit;
          transition: opacity 0.18s;
        }
        .post-card:last-child { border-bottom: none; }
        .post-card:hover { opacity: 0.72; }
        .post-meta { font-size: 12px; color: #999; margin-bottom: 10px; letter-spacing: 0.3px; }
        .post-card-title {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: -0.5px;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        .post-card-desc { font-size: 15px; color: #555; line-height: 1.55; max-width: 620px; }
        .post-tags { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .post-tag {
          font-size: 11px;
          font-weight: 500;
          color: #38BDF8;
          background: rgba(56,189,248,0.08);
          padding: 3px 10px;
          border-radius: 20px;
        }
        .blog-empty { padding: 80px 0; text-align: center; color: #777; font-size: 15px; }
        .blog-footer { padding: 32px 48px; border-top: 1px solid #e8e6e0; text-align: center; font-size: 12px; color: #aaa; }

        @media (max-width: 768px) {
          .blog-nav, .blog-header, .blog-list, .blog-footer { padding-left: 24px; padding-right: 24px; }
          .blog-header { padding-top: 56px; padding-bottom: 32px; }
          .post-card-title { font-size: 22px; }
        }
      `}</style>

      <nav className="blog-nav">
        <Link href="/" className="blog-nav-logo">Rent<span>idge</span></Link>
        <div className="blog-nav-links">
          <Link href="/">Home</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/auth?mode=signup">Get started</Link>
        </div>
      </nav>

      <header className="blog-header">
        <div className="blog-eyebrow">Rentidge Blog</div>
        <h1 className="blog-title">Guides for small landlords</h1>
        <p className="blog-sub">
          Practical writing on rent collection, security deposits, switching from spreadsheets, and the operational side of being a landlord. No fluff.
        </p>
      </header>

      <div className="blog-list">
        {posts.length === 0 ? (
          <div className="blog-empty">No posts yet — check back soon.</div>
        ) : posts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="post-card">
            <div className="post-meta">
              {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}
              {post.readingMinutes} min read
            </div>
            <h2 className="post-card-title">{post.title}</h2>
            <p className="post-card-desc">{post.description}</p>
            {post.tags.length > 0 && (
              <div className="post-tags">
                {post.tags.map(t => <span key={t} className="post-tag">{t}</span>)}
              </div>
            )}
          </Link>
        ))}
      </div>

      <footer className="blog-footer">
        © {new Date().getFullYear()} Rentidge. All rights reserved.
      </footer>
    </div>
  )
}
