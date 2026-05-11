'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import GradientMesh from '@/components/landing/GradientMesh'
import HeroStoryboard from '@/components/landing/HeroStoryboard'

export default function LandingPage() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mount stagger for hero copy. ~80ms apart per item, near-instant when
  // the user prefers reduced motion.
  const stepDelay = reduce ? 0 : 0.08
  const stepDuration = reduce ? 0.15 : 0.6
  const heroItem = (i: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: stepDuration, delay: i * stepDelay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  })

  // Reusable scroll-triggered fade-up for below-hero sections.
  const fadeUpInView = {
    initial: { opacity: 0, y: reduce ? 0 : 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: reduce ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          background: #f7f6f3 !important;
          color: #1a1a1a;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .nav {
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
        .role-list { list-style: none; margin-bottom: 40px; }
        .role-list li { font-size: 14px; color: #555; padding: 8px 0; border-bottom: 1px solid #f0ede8; display: flex; align-items: center; gap: 10px; }
        .role-list li::before { content: '→'; color: #38BDF8; font-size: 12px; }
        .btn-role { width: 100%; padding: 14px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: 1px solid #1a1a1a; background: #1a1a1a; color: #f7f6f3; }
        .btn-role:hover { background: #333; transform: translateY(-1px); }

        .footer { padding: 40px 48px; border-top: 1px solid #e8e6e0; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { font-family: 'DM Serif Display', serif; font-size: 18px; color: #1a1a1a; }
        .footer-logo span { color: #38BDF8; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 13px; color: #aaa; font-weight: 300; text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: #1a1a1a; }
        .footer-copy { font-size: 13px; color: #aaa; font-weight: 300; }

        @media (max-width: 768px) {
          .nav { padding: 0 24px; }
          .features, .roles-section { padding: 80px 24px; }
          .features-grid { grid-template-columns: 1fr; }
          .roles-grid { grid-template-columns: 1fr; }
          .stats-inner { grid-template-columns: 1fr; gap: 32px; }
          .footer { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      {/* Nav */}
      <nav
        className="nav"
        style={{
          background: scrolled ? 'rgba(247,246,243,0.92)' : 'transparent',
          borderBottom: `1px solid ${scrolled ? '#e8e6e0' : 'transparent'}`,
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <div className="nav-logo">Rent<span>idge</span></div>
        <div className="nav-actions">
          <button className="btn-ghost-nav" onClick={() => router.push('/auth?mode=signin')}>Sign in</button>
          <button className="btn-primary-nav" onClick={() => router.push('/auth?mode=signup')}>Get started</button>
        </div>
      </nav>

      {/* Hero — Tailwind two-column */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 lg:px-12">
        <GradientMesh />

        <div className="relative mx-auto max-w-[1200px] grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left column: copy */}
          <div className="text-center lg:text-left">
            <motion.div
              {...heroItem(0)}
              className="inline-flex items-center gap-2 bg-white border border-[#e8e6e0] rounded-full px-4 py-1.5 text-[12px] font-medium text-[#666] uppercase tracking-[0.08em] mb-7"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
              Property management, simplified
            </motion.div>

            <motion.h1
              {...heroItem(1)}
              className="text-[#1a1a1a] mb-5"
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 'clamp(56px, 9vw, 104px)',
                lineHeight: 0.98,
                letterSpacing: '-3px',
              }}
            >
              Rent<span style={{ color: '#38BDF8' }}>idge</span>
            </motion.h1>

            <motion.p
              {...heroItem(2)}
              className="text-[17px] sm:text-[18px] font-light text-[#555] leading-relaxed max-w-[520px] mx-auto lg:mx-0 mb-9"
            >
              Rentidge connects landlords and tenants in one seamless platform — payments, maintenance, and accounting all in one place.
            </motion.p>

            <motion.div
              {...heroItem(3)}
              className="flex flex-wrap gap-3 justify-center lg:justify-start"
            >
              <button
                onClick={() => router.push('/auth?mode=signup')}
                className="bg-[#1a1a1a] text-[#f7f6f3] border-none rounded-lg px-7 py-3.5 text-[15px] font-medium tracking-[-0.2px] cursor-pointer transition-all hover:bg-[#333] hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              >
                Get started free →
              </button>
              <button
                onClick={() => router.push('/auth?mode=signin')}
                className="bg-white text-[#1a1a1a] border border-[#d4d2cc] rounded-lg px-7 py-3.5 text-[15px] font-normal cursor-pointer transition-all hover:border-[#1a1a1a] hover:-translate-y-px"
              >
                Sign in
              </button>
            </motion.div>
          </div>

          {/* Right column: cinematic storyboard */}
          <div className="relative lg:pl-4">
            <HeroStoryboard />
          </div>
        </div>
      </section>

      {/* Features */}
      <motion.section className="features" {...fadeUpInView}>
        <p className="section-label">Everything you need</p>
        <h2 className="section-title">Built for modern property management</h2>
        <div className="features-grid">
          {[
            { title: 'Online rent payments', desc: 'Tenants pay online, funds go directly to your bank account. Automatic receipts every time.' },
            { title: 'Maintenance tracking', desc: 'Tenants submit requests, landlords manage and resolve — all in one place with full history.' },
            { title: 'QuickBooks sync', desc: 'Every payment automatically creates an income entry in QuickBooks. Zero manual bookkeeping.' },
            { title: 'AI daily briefings', desc: 'Start each day with an AI-generated summary of your portfolio — payments, requests, and more.' },
            { title: 'Autopay support', desc: 'Tenants can save their card and enable autopay so rent is never late.' },
            { title: 'Works everywhere', desc: 'Fully responsive — landlords and tenants can use Rentidge on any device.' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-number">0{i + 1}</div>
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section className="stats-section" {...fadeUpInView}>
        <div className="stats-inner">
          {[
            { number: '100%', label: 'Payments go directly to landlords' },
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
    </>
  )
}
