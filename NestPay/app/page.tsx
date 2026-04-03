'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f7f6f3;
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
          background: ${scrolled ? 'rgba(247,246,243,0.92)' : 'transparent'};
          border-bottom: 1px solid ${scrolled ? '#e8e6e0' : 'transparent'};
          backdrop-filter: ${scrolled ? 'blur(12px)' : 'none'};
        }

        .nav-logo {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          color: #1a1a1a;
          letter-spacing: -0.3px;
        }

        .nav-logo span { color: #38BDF8; }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-ghost-nav {
          background: none;
          border: 1px solid #d4d2cc;
          color: #1a1a1a;
          padding: 8px 20px;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-ghost-nav:hover {
          background: #1a1a1a;
          color: #f7f6f3;
          border-color: #1a1a1a;
        }

        .btn-primary-nav {
          background: #1a1a1a;
          border: 1px solid #1a1a1a;
          color: #f7f6f3;
          padding: 8px 20px;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary-nav:hover {
          background: #333;
          border-color: #333;
        }

        /* Hero */
        .hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 120px 24px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 800px;
          background: radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 500;
          color: #666;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 32px;
          animation: fadeUp 0.6s ease both;
        }

        .hero-eyebrow::before {
          content: '';
          width: 6px; height: 6px;
          background: #38BDF8;
          border-radius: 50%;
        }

        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(48px, 7vw, 88px);
          line-height: 1.05;
          letter-spacing: -2px;
          color: #1a1a1a;
          max-width: 800px;
          margin-bottom: 24px;
          animation: fadeUp 0.6s ease 0.1s both;
        }

        .hero-title em {
          font-style: italic;
          color: #38BDF8;
        }

        .hero-sub {
          font-size: 18px;
          font-weight: 300;
          color: #666;
          max-width: 480px;
          line-height: 1.6;
          margin-bottom: 48px;
          animation: fadeUp 0.6s ease 0.2s both;
        }

        .hero-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          animation: fadeUp 0.6s ease 0.3s both;
        }

        .btn-hero-primary {
          background: #1a1a1a;
          color: #f7f6f3;
          border: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: -0.2px;
        }

        .btn-hero-primary:hover {
          background: #333;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .btn-hero-ghost {
          background: #fff;
          color: #1a1a1a;
          border: 1px solid #d4d2cc;
          padding: 14px 32px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-hero-ghost:hover {
          border-color: #1a1a1a;
          transform: translateY(-1px);
        }

        /* Features */
        .features {
          padding: 120px 48px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .section-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #999;
          margin-bottom: 16px;
        }

        .section-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.1;
          letter-spacing: -1px;
          color: #1a1a1a;
          max-width: 500px;
          margin-bottom: 64px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          background: #e8e6e0;
          border: 1px solid #e8e6e0;
          border-radius: 16px;
          overflow: hidden;
        }

        .feature-card {
          background: #f7f6f3;
          padding: 40px 36px;
          transition: background 0.2s;
        }

        .feature-card:hover { background: #fff; }

        .feature-icon {
          font-size: 28px;
          margin-bottom: 20px;
          display: block;
        }

        .feature-title {
          font-family: 'DM Serif Display', serif;
          font-size: 20px;
          color: #1a1a1a;
          margin-bottom: 10px;
          letter-spacing: -0.3px;
        }

        .feature-desc {
          font-size: 14px;
          font-weight: 300;
          color: #777;
          line-height: 1.6;
        }

        /* Stats */
        .stats-section {
          padding: 80px 48px;
          background: #1a1a1a;
          color: #f7f6f3;
        }

        .stats-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 48px;
          text-align: center;
        }

        .stat-number {
          font-family: 'DM Serif Display', serif;
          font-size: 56px;
          color: #38BDF8;
          letter-spacing: -2px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          font-weight: 300;
          color: rgba(247,246,243,0.6);
        }

        /* Roles */
        .roles-section {
          padding: 120px 48px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .roles-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 64px;
        }

        .role-card {
          border: 1px solid #e8e6e0;
          border-radius: 16px;
          padding: 48px 40px;
          background: #fff;
          transition: all 0.3s;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .role-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: #38BDF8;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s;
        }

        .role-card:hover::before { transform: scaleX(1); }
        .role-card:hover { border-color: #38BDF8; box-shadow: 0 20px 60px rgba(0,0,0,0.06); }

        .role-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #38BDF8;
          margin-bottom: 16px;
        }

        .role-title {
          font-family: 'DM Serif Display', serif;
          font-size: 32px;
          color: #1a1a1a;
          letter-spacing: -0.5px;
          margin-bottom: 16px;
        }

        .role-desc {
          font-size: 15px;
          font-weight: 300;
          color: #777;
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .role-list {
          list-style: none;
          margin-bottom: 40px;
        }

        .role-list li {
          font-size: 14px;
          color: #555;
          padding: 8px 0;
          border-bottom: 1px solid #f0ede8;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .role-list li::before {
          content: '→';
          color: #38BDF8;
          font-size: 12px;
        }

        .btn-role {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #1a1a1a;
          background: #1a1a1a;
          color: #f7f6f3;
        }

        .btn-role:hover {
          background: #333;
          transform: translateY(-1px);
        }

        /* Footer */
        .footer {
          padding: 40px 48px;
          border-top: 1px solid #e8e6e0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-logo {
          font-family: 'DM Serif Display', serif;
          font-size: 18px;
          color: #1a1a1a;
        }

        .footer-logo span { color: #38BDF8; }

        .footer-copy {
          font-size: 13px;
          color: #aaa;
          font-weight: 300;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

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
      <nav className="nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 48px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.3s, border-color 0.3s',
        background: scrolled ? 'rgba(247,246,243,0.92)' : 'transparent',
        borderBottom: `1px solid ${scrolled ? '#e8e6e0' : 'transparent'}`,
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}>
        <div className="nav-logo">Nest<span>Bridge</span></div>
        <div className="nav-actions">
          <button className="btn-ghost-nav" onClick={() => router.push('/auth?mode=signin')}>Sign in</button>
          <button className="btn-primary-nav" onClick={() => router.push('/auth?mode=signup')}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-eyebrow">Property management, simplified</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(64px, 10vw, 120px)', letterSpacing: '-3px', lineHeight: 1, marginBottom: 24, animation: 'fadeUp 0.6s ease 0.1s both' }}>
          Nest<span style={{ color: '#38BDF8' }}>Bridge</span>
        </h1>
        <p className="hero-sub">
          NestBridge connects landlords and tenants in one seamless platform — payments, maintenance, and accounting all in one place.
        </p>
        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={() => router.push('/auth?mode=signup')}>
            Get started free →
          </button>
          <button className="btn-hero-ghost" onClick={() => router.push('/auth?mode=signin')}>
            Sign in
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <p className="section-label">Everything you need</p>
        <h2 className="section-title">Built for modern property management</h2>
        <div className="features-grid">
          {[
            { icon: '💳', title: 'Online rent payments', desc: 'Tenants pay online, funds go directly to your bank account. Automatic receipts every time.' },
            { icon: '🔧', title: 'Maintenance tracking', desc: 'Tenants submit requests, landlords manage and resolve — all in one place with full history.' },
            { icon: '📊', title: 'QuickBooks sync', desc: 'Every payment automatically creates an income entry in QuickBooks. Zero manual bookkeeping.' },
            { icon: '🤖', title: 'AI daily briefings', desc: 'Start each day with an AI-generated summary of your portfolio — payments, requests, and more.' },
            { icon: '🔄', title: 'Autopay support', desc: 'Tenants can save their card and enable autopay so rent is never late.' },
            { icon: '📱', title: 'Works everywhere', desc: 'Fully responsive — landlords and tenants can use NestBridge on any device.' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
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
      </section>

      {/* Roles */}
      <section className="roles-section">
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
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">Nest<span>Bridge</span></div>
        <p className="footer-copy">© {new Date().getFullYear()} NestBridge. All rights reserved.</p>
      </footer>
    </>
  )
}
