'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import GradientMesh from '@/components/landing/GradientMesh'
import HeroShowcase from '@/components/landing/HeroShowcase'

export default function LandingPage() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mount stagger for hero copy.
  const stepDelay = reduce ? 0 : 0.08
  const stepDuration = reduce ? 0.15 : 0.55
  const heroItem = (i: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: stepDuration,
      delay: i * stepDelay,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  })

  // Reusable scroll-triggered fade-up for below-hero sections.
  const fadeUpInView = {
    initial: { opacity: 0, y: reduce ? 0 : 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: {
      duration: reduce ? 0.2 : 0.7,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }

  return (
    <div className="landing-root">
      <style>{`
        /* Landing-page-only styles. The Google Fonts <link> is in app/layout.tsx <head>
           (inline @import here got HTML-escaped by React, breaking the URL — see PR notes).
           Landing colors are scoped to .landing-root so they CANNOT leak into the
           authenticated dashboard, which uses globals.css's dark theme. Previously this
           was an html/body !important override, which caused a brief flash of light
           background when navigating from /  →  /dashboard before the style unmounted. */

        .landing-root {
          background: #f7f6f3;
          color: #1a1a1a;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        .nav-legacy {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 0 48px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.3s, border-color 0.3s;
        }
        .nav-logo { font-family: 'DM Serif Display', serif; font-size: 22px; color: #1a1a1a; letter-spacing: -0.3px; }
        .nav-logo span { color: #38BDF8; }
        .nav-actions { display: flex; align-items: center; gap: 12px; }
        .btn-ghost-nav {
          background: rgba(255,255,255,0.6); border: 1px solid #d4d2cc; color: #1a1a1a;
          padding: 8px 20px; border-radius: 6px; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 400; cursor: pointer; transition: all 0.2s;
          backdrop-filter: blur(6px);
        }
        .btn-ghost-nav:hover { background: #1a1a1a; color: #f7f6f3; border-color: #1a1a1a; }
        .btn-primary-nav {
          background: #1a1a1a; border: 1px solid #1a1a1a; color: #f7f6f3;
          padding: 8px 20px; border-radius: 6px; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        .btn-primary-nav:hover { background: #333; border-color: #333; }

        .features { padding: 120px 48px; max-width: 1100px; margin: 0 auto; }
        .section-label { font-size: 11px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: #999; margin-bottom: 16px; }
        .section-title { font-family: 'DM Serif Display', serif; font-size: clamp(32px, 4vw, 48px); line-height: 1.1; letter-spacing: -1px; color: #1a1a1a; max-width: 500px; margin-bottom: 64px; }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: #e8e6e0; border: 1px solid #e8e6e0; border-radius: 16px; overflow: hidden; }
        .feature-card { background: #f7f6f3; padding: 40px 36px; transition: background 0.2s; }
        .feature-card:hover { background: #fff; }
        .feature-number { font-family: 'DM Serif Display', serif; font-size: 13px; color: #38BDF8; margin-bottom: 28px; letter-spacing: 0.5px; font-weight: 500; }
        .feature-title { font-family: 'DM Serif Display', serif; font-size: 20px; color: #1a1a1a; margin-bottom: 10px; letter-spacing: -0.3px; }
        .feature-desc { font-size: 14px; font-weight: 300; color: #777; line-height: 1.6; }

        .stats-section { padding: 80px 48px; background: #1a1a1a; color: #f7f6f3; }
        .stats-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; text-align: center; }
        .stat-number { font-family: 'DM Serif Display', serif; font-size: 56px; color: #38BDF8; letter-spacing: -2px; line-height: 1; margin-bottom: 8px; }
        .stat-label { font-size: 14px; font-weight: 300; color: rgba(247,246,243,0.6); }

        .roles-section { padding: 120px 48px; max-width: 1100px; margin: 0 auto; }
        .roles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 64px; }
        .role-card { border: 1px solid #e8e6e0; border-radius: 16px; padding: 48px 40px; background: #fff; transition: all 0.3s; cursor: pointer; position: relative; overflow: hidden; }
        .role-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #38BDF8; transform: scaleX(0); transform-origin: left; transition: transform 0.3s; }
        .role-card:hover::before { transform: scaleX(1); }
        .role-card:hover { border-color: #38BDF8; box-shadow: 0 20px 60px rgba(0,0,0,0.06); }
        .role-tag { display: inline-block; font-size: 11px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; color: #38BDF8; margin-bottom: 16px; }
        .role-title { font-family: 'DM Serif Display', serif; font-size: 32px; color: #1a1a1a; letter-spacing: -0.5px; margin-bottom: 16px; }
        .role-desc { font-size: 15px; font-weight: 300; color: #777; line-height: 1.7; margin-bottom: 32px; }
        .role-list { list-style: none; margin-bottom: 40px; padding: 0; }
        .role-list li { font-size: 14px; color: #555; padding: 8px 0; border-bottom: 1px solid #f0ede8; display: flex; align-items: center; gap: 10px; }
        .role-list li::before { content: '→'; color: #38BDF8; font-size: 12px; }
        .btn-role { width: 100%; padding: 14px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: 1px solid #1a1a1a; background: #1a1a1a; color: #f7f6f3; }
        .btn-role:hover { background: #333; transform: translateY(-1px); }

        .compare-section { padding: 120px 48px; max-width: 1100px; margin: 0 auto; }
        .compare-wrap { background: #fff; border: 1px solid #e8e6e0; border-radius: 16px; overflow: hidden; }
        .compare-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .compare-table thead th {
          font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 11px;
          text-transform: uppercase; letter-spacing: 1.2px; color: #999;
          padding: 22px 24px; text-align: left; background: #faf9f6;
          border-bottom: 1px solid #e8e6e0;
        }
        .compare-table thead th.compare-rentidge-head {
          background: #1a1a1a; color: #f7f6f3; position: relative;
        }
        .compare-table thead th.compare-rentidge-head::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #38BDF8;
        }
        .compare-table tbody td {
          padding: 18px 24px; border-bottom: 1px solid #f0ede8; vertical-align: middle;
        }
        .compare-table tbody tr:last-child td { border-bottom: none; }
        .compare-table td.compare-name { font-weight: 500; color: #1a1a1a; }
        .compare-table td.compare-rentidge { background: rgba(56,189,248,0.06); color: #1a1a1a; font-weight: 500; }
        .compare-table td.compare-other { color: #777; font-weight: 300; }
        .compare-footnote { font-size: 12px; color: #999; margin-top: 16px; text-align: center; font-style: italic; }

        .footer { padding: 40px 48px; border-top: 1px solid #e8e6e0; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { font-family: 'DM Serif Display', serif; font-size: 18px; color: #1a1a1a; }
        .footer-logo span { color: #38BDF8; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 13px; color: #aaa; font-weight: 300; text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: #1a1a1a; }
        .footer-copy { font-size: 13px; color: #aaa; font-weight: 300; }

        @media (max-width: 768px) {
          .nav-legacy { padding: 0 24px; }
          .features, .roles-section, .compare-section { padding: 80px 24px; }
          .compare-table thead th, .compare-table tbody td { padding: 12px 14px; font-size: 13px; }
          .features-grid { grid-template-columns: 1fr; }
          .roles-grid { grid-template-columns: 1fr; }
          .stats-inner { grid-template-columns: 1fr; gap: 32px; }
          .footer { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      {/* Nav */}
      <nav
        className="nav-legacy"
        style={{
          background: scrolled ? 'rgba(247,246,243,0.92)' : 'transparent',
          borderBottom: `1px solid ${scrolled ? '#e8e6e0' : 'transparent'}`,
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <div className="nav-logo">Rent<span>idge</span></div>
        <div className="nav-actions">
          <a href="/blog" className="nav-link" style={{ color: '#1a1a1a', textDecoration: 'none', fontSize: 14, marginRight: 8 }}>Blog</a>
          <button className="btn-ghost-nav" onClick={() => router.push('/auth?mode=signin')}>Sign in</button>
          <button className="btn-primary-nav" onClick={() => router.push('/auth?mode=signup')}>Get started</button>
        </div>
      </nav>

      {/* Hero — Tailwind two-column */}
      <section className="relative overflow-hidden pt-32 pb-24 lg:pt-36 lg:pb-32 px-6 lg:px-12">
        <GradientMesh />

        <div className="relative mx-auto max-w-[1240px] grid lg:grid-cols-[45%_55%] gap-12 lg:gap-14 items-center">
          {/* Left — copy */}
          <div className="text-center lg:text-left">
            <motion.div
              {...heroItem(0)}
              className="inline-flex items-center gap-2 bg-white border border-zinc-200 rounded-full px-4 py-1.5 text-[12px] font-medium text-zinc-500 uppercase tracking-[0.08em] mb-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
              Property management, simplified
            </motion.div>

            <motion.h1
              {...heroItem(1)}
              className="text-zinc-900 mb-5"
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 'clamp(56px, 8.5vw, 100px)',
                lineHeight: 0.98,
                letterSpacing: '-3px',
              }}
            >
              Rent<span style={{ color: '#38BDF8' }}>idge</span>
            </motion.h1>

            <motion.p
              {...heroItem(2)}
              className="text-[17px] sm:text-[18px] font-light text-zinc-600 leading-relaxed max-w-[520px] mx-auto lg:mx-0 mb-9"
            >
              Rent collection that doesn't feel like a second job. Autopay, maintenance, and books — all on autopilot.
            </motion.p>

            <motion.div
              {...heroItem(3)}
              className="flex flex-wrap gap-3 justify-center lg:justify-start"
            >
              <button
                onClick={() => router.push('/auth?mode=signup')}
                className="bg-zinc-900 text-[#f7f6f3] border-none rounded-lg px-7 py-3.5 text-[15px] font-medium tracking-[-0.2px] cursor-pointer transition-all hover:bg-zinc-800 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              >
                Get started free →
              </button>
              <button
                onClick={() => router.push('/auth?mode=signin')}
                className="bg-white text-zinc-900 border border-zinc-300 rounded-lg px-7 py-3.5 text-[15px] font-normal cursor-pointer transition-all hover:border-zinc-900 hover:-translate-y-px"
              >
                Sign in
              </button>
            </motion.div>
          </div>

          {/* Right — animated product showcase */}
          <div className="relative">
            <HeroShowcase />
          </div>
        </div>
      </section>

      {/* Features */}
      <motion.section className="features" {...fadeUpInView}>
        <p className="section-label">What changes when you switch</p>
        <h2 className="section-title">Get the busywork off your plate</h2>
        <div className="features-grid">
          {[
            { title: 'Get paid by the 3rd, every month', desc: 'Tenants pay online, funds settle to your bank in T+2. Autopay means rent is never late.' },
            { title: 'Cut maintenance back-and-forth in half', desc: 'Tenants submit, you triage and resolve, history stays with the unit. No more text-message archaeology.' },
            { title: 'Tax season takes 10 minutes, not 10 hours', desc: 'Every payment auto-syncs to QuickBooks as an income entry. Your accountant will love you.' },
            { title: 'Know what to do today in 30 seconds', desc: 'AI assistant pulls your portfolio into a daily briefing with charts. Ask follow-ups in plain English.' },
            { title: 'Never chase rent again', desc: 'Tenants save their card once and autopay handles every month. Alerts fire only when something breaks.' },
            { title: 'Monthly statements, automatically', desc: 'The 1st of every month: a clean PDF of last month’s income, with an AI summary, in your inbox.' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-number">0{i + 1}</div>
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Comparison */}
      <motion.section className="compare-section" {...fadeUpInView}>
        <p className="section-label">How it stacks up</p>
        <h2 className="section-title">Stop juggling tools</h2>
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th></th>
                <th className="compare-rentidge-head">Rentidge</th>
                <th>Spreadsheets + Venmo</th>
                <th>Other property tools</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Setup time',                 r: 'Under 5 minutes',     diy: 'Hours',              other: 'Hours to days' },
                { name: 'QuickBooks sync',            r: 'Built-in, automatic', diy: 'Manual CSV exports', other: 'Paid add-on' },
                { name: 'AI daily briefings',         r: 'Included',            diy: '—',                  other: '—' },
                { name: 'PDF monthly statements',     r: 'Auto-emailed on the 1st', diy: 'DIY in Excel',   other: 'Manual export' },
                { name: 'Tenant payment portal',      r: 'Yes',                 diy: '—',                  other: 'Yes' },
                { name: 'Per-transaction fee',        r: '8%, paid by landlord',diy: 'Free (manual reconcile)', other: '1–3% + monthly fee' },
                { name: 'Monthly subscription',       r: 'Free during beta',    diy: 'Free',               other: '$25–100+' },
              ].map((row, i) => (
                <tr key={i}>
                  <td className="compare-name">{row.name}</td>
                  <td className="compare-rentidge">{row.r}</td>
                  <td className="compare-other">{row.diy}</td>
                  <td className="compare-other">{row.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="compare-footnote">
          Comparisons reflect typical configurations as of June 2026.
        </p>
      </motion.section>

      {/* Stats */}
      <motion.section className="stats-section" {...fadeUpInView}>
        <div className="stats-inner">
          {[
            { number: 'T+2', label: 'Funds settle to your bank' },
            { number: '$0', label: 'Setup fee — free to get started' },
            { number: '24/7', label: 'AI assistant always available' },
          ].map((s, i) => (
            <div key={i}>
              <div className="stat-number">{s.number}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Roles */}
      <motion.section className="roles-section" {...fadeUpInView}>
        <p className="section-label">Who it's for</p>
        <h2 className="section-title">One platform, two experiences</h2>
        <div className="roles-grid">
          <div className="role-card" onClick={() => router.push('/auth?mode=signup')}>
            <span className="role-tag">Landlord</span>
            <h3 className="role-title">Manage your portfolio</h3>
            <p className="role-desc">Everything you need to run your rental properties without the headaches.</p>
            <ul className="role-list">
              <li>Track payments across all units</li>
              <li>Manage maintenance requests</li>
              <li>Connect QuickBooks & Stripe</li>
              <li>AI-powered daily briefings</li>
            </ul>
            <button className="btn-role">Get started as a landlord →</button>
          </div>
          <div className="role-card" onClick={() => router.push('/auth?mode=signup')}>
            <span className="role-tag">Tenant</span>
            <h3 className="role-title">Pay rent with ease</h3>
            <p className="role-desc">A simple, secure portal to pay rent and submit maintenance requests.</p>
            <ul className="role-list">
              <li>Pay rent online securely</li>
              <li>Save card for autopay</li>
              <li>Submit maintenance requests</li>
              <li>View payment history</li>
            </ul>
            <button className="btn-role">Get started as a tenant →</button>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">Rent<span>idge</span></div>
        <div className="footer-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/eula">Terms of Service</a>
          <a href="mailto:support@rentidge.com">support@rentidge.com</a>
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} Rentidge. All rights reserved.</p>
      </footer>
    </div>
  )
}
