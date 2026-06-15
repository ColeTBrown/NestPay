'use client'
import { useEffect, useState, useCallback } from 'react'

// Sales deck for live discovery calls. Use case:
//   - Open this URL in fullscreen during a Zoom share-screen
//   - Arrow keys navigate slides
//   - Press 'n' to toggle speaker notes (visible to you, not on the slide)
//   - Press 'f' to enter browser fullscreen
//   - Send the URL to a prospect to self-tour after the call
//
// noindex so it doesn't compete with the landing page in search results.
// Anyone with the link can view it — there's nothing sensitive here.

type Slide = {
  id: string
  background: 'cream' | 'dark' | 'white'
  content: React.ReactNode
  notes: string
}

const ACCENT = '#38BDF8'

export default function SalesDeckPage() {
  const [current, setCurrent] = useState(0)
  const [showNotes, setShowNotes] = useState(false)

  const next = useCallback(() => setCurrent(c => Math.min(c + 1, SLIDES.length - 1)), [])
  const prev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        prev()
      } else if (e.key === 'n' || e.key === 'N') {
        setShowNotes(s => !s)
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {})
        } else {
          document.exitFullscreen().catch(() => {})
        }
      } else if (e.key === 'Home') {
        setCurrent(0)
      } else if (e.key === 'End') {
        setCurrent(SLIDES.length - 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev])

  const slide = SLIDES[current]
  const bg = slide.background === 'dark' ? '#1a1a1a' : slide.background === 'white' ? '#ffffff' : '#f7f6f3'
  const fg = slide.background === 'dark' ? '#f7f6f3' : '#1a1a1a'

  return (
    <div className="deck-root">
      <style>{`
        html, body { background: ${bg}; }
        .deck-root {
          position: fixed; inset: 0;
          background: ${bg};
          color: ${fg};
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow: hidden;
          transition: background 0.3s, color 0.3s;
        }
        .stage {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 6vh 8vw;
        }
        .slide-inner {
          width: 100%;
          max-width: 1100px;
        }
        .slide-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(48px, 6.5vw, 84px);
          line-height: 1.02;
          letter-spacing: -2.5px;
          margin-bottom: 28px;
        }
        .slide-title .ink-accent { color: ${ACCENT}; }
        .slide-eyebrow {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: ${slide.background === 'dark' ? 'rgba(247,246,243,0.55)' : '#999'};
          margin-bottom: 28px;
        }
        .slide-body {
          font-size: clamp(18px, 2.1vw, 24px);
          line-height: 1.55;
          font-weight: 300;
          max-width: 760px;
          color: ${slide.background === 'dark' ? 'rgba(247,246,243,0.85)' : '#444'};
        }
        .slide-body strong {
          font-weight: 500;
          color: ${slide.background === 'dark' ? '#fff' : '#1a1a1a'};
        }
        .bullet-list { list-style: none; padding: 0; margin: 32px 0 0; }
        .bullet-list li {
          font-size: clamp(18px, 1.9vw, 22px);
          line-height: 1.45;
          font-weight: 300;
          padding: 12px 0 12px 36px;
          position: relative;
          color: ${slide.background === 'dark' ? 'rgba(247,246,243,0.9)' : '#222'};
        }
        .bullet-list li::before {
          content: '';
          position: absolute;
          left: 0; top: 22px;
          width: 18px; height: 2px;
          background: ${ACCENT};
        }
        .bullet-list li strong {
          font-weight: 500;
          color: ${slide.background === 'dark' ? '#fff' : '#1a1a1a'};
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          background: ${slide.background === 'dark' ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.1)'};
          color: ${ACCENT};
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .pill::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: ${ACCENT};
        }
        .big-stat {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(72px, 11vw, 144px);
          line-height: 1;
          letter-spacing: -4px;
          color: ${ACCENT};
        }
        .stat-label {
          font-size: 16px;
          color: ${slide.background === 'dark' ? 'rgba(247,246,243,0.6)' : '#777'};
          margin-top: 8px;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 40px;
        }
        .feature-tile {
          background: ${slide.background === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
          border: 1px solid ${slide.background === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8e6e0'};
          border-radius: 16px;
          padding: 24px 28px;
        }
        .feature-tile h3 {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          line-height: 1.15;
          letter-spacing: -0.4px;
          margin-bottom: 8px;
          color: ${slide.background === 'dark' ? '#fff' : '#1a1a1a'};
        }
        .feature-tile p {
          font-size: 14px;
          font-weight: 300;
          color: ${slide.background === 'dark' ? 'rgba(247,246,243,0.7)' : '#666'};
          line-height: 1.5;
        }
        .compare-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 28px;
          font-size: 14px;
          background: ${slide.background === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
          border-radius: 12px;
          overflow: hidden;
        }
        .compare-table th, .compare-table td {
          padding: 14px 18px;
          text-align: left;
          border-bottom: 1px solid ${slide.background === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0ede8'};
        }
        .compare-table tr:last-child td { border-bottom: none; }
        .compare-table th {
          font-weight: 500;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: ${slide.background === 'dark' ? 'rgba(247,246,243,0.5)' : '#999'};
        }
        .compare-table th.rent-col, .compare-table td.rent-col {
          background: rgba(56,189,248,0.08);
          color: ${slide.background === 'dark' ? '#fff' : '#1a1a1a'};
          font-weight: 500;
        }
        .compare-table th.rent-col {
          background: ${slide.background === 'dark' ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.15)'};
          color: ${ACCENT};
        }
        .product-mock {
          background: ${slide.background === 'dark' ? '#0F172A' : '#0F172A'};
          color: #E2E8F0;
          border-radius: 16px;
          padding: 28px;
          margin-top: 24px;
          font-size: 14px;
        }
        .mock-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .mock-row:last-child { border-bottom: none; }
        .mock-tag {
          background: rgba(62,207,142,0.15);
          color: #3ecf8e;
          font-size: 11px; font-weight: 500;
          padding: 3px 10px; border-radius: 20px;
        }
        .email-mock {
          background: #fff;
          border: 1px solid #e8e6e0;
          border-radius: 12px;
          padding: 24px;
          margin-top: 24px;
          color: #1a1a1a;
          max-width: 520px;
        }
        .email-mock-brand { font-family: 'DM Serif Display', serif; font-size: 16px; }
        .email-mock-brand span { color: ${ACCENT}; }
        .email-mock-title {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          margin: 12px 0 4px;
          letter-spacing: -0.3px;
        }
        .email-mock-sub { font-size: 12px; color: #777; margin-bottom: 14px; }
        .email-mock-body { font-size: 13px; line-height: 1.55; color: #333; margin-bottom: 14px; }
        .email-mock-total { font-size: 13px; }
        .email-mock-attach {
          margin-top: 12px; padding-top: 12px; border-top: 1px solid #e8e6e0;
          font-size: 11px; color: #999;
        }

        .hud {
          position: absolute; bottom: 16px; left: 16px; right: 16px;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 11px; color: ${slide.background === 'dark' ? 'rgba(247,246,243,0.4)' : 'rgba(26,26,26,0.4)'};
          z-index: 10;
        }
        .hud-mid { display: flex; gap: 16px; align-items: center; }
        .hud button {
          background: transparent; border: 1px solid currentColor;
          color: inherit; padding: 4px 10px; border-radius: 6px;
          font-size: 11px; cursor: pointer; opacity: 0.6;
        }
        .hud button:hover { opacity: 1; }
        .progress {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: rgba(0,0,0,0.04);
          z-index: 10;
        }
        .progress-fill {
          height: 100%; background: ${ACCENT};
          width: ${((current + 1) / SLIDES.length) * 100}%;
          transition: width 0.3s;
        }
        .notes-panel {
          position: absolute; bottom: 56px; left: 16px; right: 16px;
          max-height: 30vh; overflow-y: auto;
          background: rgba(15,23,42,0.95);
          color: #f7f6f3;
          border-radius: 12px;
          padding: 18px 20px;
          font-size: 14px;
          line-height: 1.55;
          z-index: 9;
          backdrop-filter: blur(8px);
        }
        .notes-panel-label {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: ${ACCENT};
          margin-bottom: 8px;
          font-weight: 500;
        }

        @media print {
          .hud, .notes-panel, .progress { display: none !important; }
          .deck-root { position: static; overflow: visible; }
          .stage { page-break-after: always; min-height: 100vh; }
        }
      `}</style>

      <div className="progress"><div className="progress-fill" /></div>

      <div className="stage">
        <div className="slide-inner">{slide.content}</div>
      </div>

      {showNotes && (
        <div className="notes-panel">
          <div className="notes-panel-label">Speaker notes</div>
          {slide.notes}
        </div>
      )}

      <div className="hud">
        <span>Rentidge · Sales</span>
        <div className="hud-mid">
          <button onClick={prev} disabled={current === 0}>← Prev</button>
          <span>{current + 1} / {SLIDES.length}</span>
          <button onClick={next} disabled={current === SLIDES.length - 1}>Next →</button>
        </div>
        <span>
          <button onClick={() => setShowNotes(s => !s)}>
            {showNotes ? 'Hide notes (N)' : 'Notes (N)'}
          </button>
          {' '}
          <button onClick={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
            else document.exitFullscreen().catch(() => {})
          }}>Fullscreen (F)</button>
        </span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Slides
// ────────────────────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  {
    id: 'title',
    background: 'cream',
    content: (
      <>
        <div className="pill">Rentidge</div>
        <h1 className="slide-title">
          Rent collection that<br />
          doesn't feel like a<br />
          <span className="ink-accent">second job.</span>
        </h1>
        <p className="slide-body" style={{ marginTop: 24 }}>
          A 15-minute walkthrough of what we built for small landlords.
        </p>
      </>
    ),
    notes:
      "Open with: 'Hi [Name], thanks for jumping on. I'm going to walk you through what we've built — should take about 15 minutes. Stop me with questions any time, and at the end I'll show you how to get set up if you're interested.' Set expectations: this is a working product, you're talking to the founder, decisions get made fast.",
  },

  {
    id: 'problem',
    background: 'dark',
    content: (
      <>
        <div className="pill">The problem</div>
        <h1 className="slide-title">If you own <span className="ink-accent">1–25 units</span>,<br />your day looks like this.</h1>
        <ul className="bullet-list">
          <li><strong>Chasing rent</strong> in Venmo, Zelle, the occasional check that sits on your counter</li>
          <li><strong>Reconciling payments</strong> by hand into a spreadsheet — and into QuickBooks at tax time</li>
          <li><strong>Tenant texts</strong> about a clogged drain on a Sunday night, no record of who reported what</li>
          <li><strong>"Did I get rent from 2B?"</strong> — checked four times this month</li>
        </ul>
      </>
    ),
    notes:
      "Lead with empathy. Pause after reading the list — let them recognize themselves. If they laugh or sigh, you've got engagement. Common follow-up: 'How many units do you have?' 'How do you handle rent today?' Let them talk. The longer they describe their pain, the better the next slide lands.",
  },

  {
    id: 'what-changes',
    background: 'cream',
    content: (
      <>
        <div className="pill">What changes</div>
        <h1 className="slide-title">All of that <span className="ink-accent">just stops.</span></h1>
        <ul className="bullet-list">
          <li><strong>Rent paid by the 3rd</strong> — tenants set up autopay once, you stop chasing</li>
          <li><strong>QuickBooks reconciles itself</strong> — every payment auto-syncs as an income entry</li>
          <li><strong>An AI assistant tells you what's urgent</strong> — every morning, in one paragraph</li>
          <li><strong>A monthly statement lands in your inbox</strong> — PDF, on the 1st, with an AI summary</li>
        </ul>
      </>
    ),
    notes:
      "Punch each line. The 'just stops' framing is intentional — most software demos say 'we help you with X.' I'm saying X goes away. After this slide, ask: 'Which of those would matter most to you?' Their answer tells you where to spend time in the rest of the demo.",
  },

  {
    id: 'dashboard',
    background: 'cream',
    content: (
      <>
        <div className="slide-eyebrow">Live demo</div>
        <h1 className="slide-title" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>Your landlord dashboard.</h1>
        <p className="slide-body">One screen, total clarity.</p>
        <div className="product-mock">
          <div className="mock-row">
            <span><strong style={{ color: '#fff' }}>Property dashboard</strong> · 2 units</span>
            <span style={{ color: '#3ecf8e', fontWeight: 500 }}>$3,800 collected</span>
          </div>
          <div className="mock-row">
            <span>Unit 2B — Sarah K.</span>
            <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>$2,000 · <span className="mock-tag">Paid</span></span>
          </div>
          <div className="mock-row">
            <span>Unit 4A — James R.</span>
            <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>$1,800 · <span className="mock-tag">Paid</span></span>
          </div>
          <div className="mock-row">
            <span style={{ color: '#94A3B8' }}>Open maintenance requests</span>
            <span style={{ color: '#f5a623' }}>1 pending</span>
          </div>
        </div>
      </>
    ),
    notes:
      "If you can screen-share to the actual dashboard, do it here — live product beats any mock. If not, walk through this representation: 'You see everything in one screen. Total collected this month, who paid, who didn't, and what maintenance needs attention. No scrolling, no tab-hopping, no spreadsheets.' Pause for questions.",
  },

  {
    id: 'tenant',
    background: 'white',
    content: (
      <>
        <div className="slide-eyebrow">Tenant side</div>
        <h1 className="slide-title">Your tenant signs up in <span className="ink-accent">90 seconds.</span></h1>
        <ul className="bullet-list">
          <li><strong>You generate an invite code</strong> on the dashboard — one click per unit</li>
          <li><strong>Tenant goes to rentidge.com</strong>, enters the code, sets up their account</li>
          <li><strong>They pay rent through their portal</strong> — funds settle directly to your bank in T+2</li>
          <li><strong>Autopay is one checkbox</strong> — set the card once, never chase again</li>
        </ul>
        <p className="slide-body" style={{ marginTop: 32, fontSize: 16, color: '#666' }}>
          We use Stripe — same payments rail as Uber, Lyft, Shopify. We don't hold your money.
        </p>
      </>
    ),
    notes:
      "The 'we don't hold your money' line is important — landlords coming from Buildium/AppFolio have horror stories about platforms sitting on rent for days. With Stripe Connect, funds go directly from the tenant's card to the landlord's bank. We never touch it. If they ask about Stripe fees, say: 'Standard Stripe processing — about 2.9% + 30¢ per card transaction. ACH is cheaper. That's separate from our 8%, which I'll cover in a few slides.'",
  },

  {
    id: 'monthly-statements',
    background: 'cream',
    content: (
      <>
        <div className="pill">The differentiator</div>
        <h1 className="slide-title">On the <span className="ink-accent">1st of every month</span>,<br />your inbox has this.</h1>
        <div className="email-mock">
          <div className="email-mock-brand">Rent<span>idge</span></div>
          <div className="email-mock-title">May 2026 statement</div>
          <div className="email-mock-sub">Prepared for Cole Brown</div>
          <div className="email-mock-body">
            In May 2026, you collected $3,800 across 2 successful payments — up 5% from April. Both units paid on time. No outstanding balances.
          </div>
          <div className="email-mock-total"><strong>Total collected:</strong> $3,800.00</div>
          <div className="email-mock-attach">📎 rentidge-2026-05.pdf attached</div>
        </div>
      </>
    ),
    notes:
      "This is what gets accountants excited. Most landlord software requires you to LOG IN and EXPORT a report at the end of every month. Ours just emails you the PDF. The AI narrative is real — Claude writes a short factual summary based on your data. Forward the email to your accountant and you're done with monthly bookkeeping. Real testimonial language to use: 'My CPA said this saved her 2 hours per month per property.' (Don't claim a real customer said this yet — but it's the kind of thing you'll hear.)",
  },

  {
    id: 'movein',
    background: 'white',
    content: (
      <>
        <div className="slide-eyebrow">Built for real leases</div>
        <h1 className="slide-title">Move-in done right.</h1>
        <div className="feature-grid">
          <div className="feature-tile">
            <h3>First + last month</h3>
            <p>Toggle it on per-landlord. Tenant pays 2× rent on move-in. The held last month auto-credits at lease end — they pay $0 their final month, automatically.</p>
          </div>
          <div className="feature-tile">
            <h3>Security deposit</h3>
            <p>Set the amount per unit. Charge it bundled with move-in or as a separate transaction. Held amount tracked on the tenant record.</p>
          </div>
          <div className="feature-tile">
            <h3>State law aware</h3>
            <p>We flag jurisdictions with strict trust-account requirements so you know when to consult counsel before collecting.</p>
          </div>
          <div className="feature-tile">
            <h3>One payment flow</h3>
            <p>Tenant sees a single card: "Pay $X — first + last + deposit." No three-form runaround. Stripe handles the rest.</p>
          </div>
        </div>
      </>
    ),
    notes:
      "This slide differentiates from RentRedi and Avail — they handle rent but don't handle move-in well. If they ask about itemized deposit returns at move-out, be honest: 'V2 of the deposit flow includes itemized deductions and automated refunds. V1 is collect + track; you handle the return manually via Stripe today. That's on the roadmap — and if you need it sooner, it's the kind of thing I'd prioritize for an early customer.' (This is your 'we can add features' moment.)",
  },

  {
    id: 'ai',
    background: 'dark',
    content: (
      <>
        <div className="pill">The thing other tools don't have</div>
        <h1 className="slide-title">An AI assistant that<br /><span className="ink-accent">knows your portfolio.</span></h1>
        <p className="slide-body">Ask anything in plain English:</p>
        <ul className="bullet-list" style={{ marginTop: 20 }}>
          <li>"Which units are late this month?"</li>
          <li>"What should I do today?"</li>
          <li>"Show me my occupancy trend"  <span style={{ color: ACCENT, fontSize: 14 }}>← renders a chart inline</span></li>
          <li>"Summarize the maintenance backlog"</li>
        </ul>
        <p className="slide-body" style={{ marginTop: 24, fontSize: 16 }}>
          Built on Claude. Has full context on your properties, units, tenants, payments, and maintenance.
        </p>
      </>
    ),
    notes:
      "Buildium does not have this. AppFolio does not have this. Avail does not have this. This is a real differentiator and you should lean into it. Demo it live if possible. If they ask 'is my data being sent to OpenAI?' — answer: 'No — we use Anthropic's Claude. Your data is sent only as context for your queries, never used to train any model.' (That's how the Anthropic API actually works — see anthropic.com/legal/aup.)",
  },

  {
    id: 'compare',
    background: 'cream',
    content: (
      <>
        <div className="slide-eyebrow">Where we sit</div>
        <h1 className="slide-title" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>How we compare.</h1>
        <table className="compare-table">
          <thead>
            <tr>
              <th></th>
              <th className="rent-col">Rentidge</th>
              <th>Spreadsheets + Venmo</th>
              <th>Buildium / AppFolio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Setup time</strong></td>
              <td className="rent-col">Under 5 min</td>
              <td>Hours</td>
              <td>Hours to days</td>
            </tr>
            <tr>
              <td><strong>QuickBooks sync</strong></td>
              <td className="rent-col">Built-in</td>
              <td>Manual CSVs</td>
              <td>Paid add-on</td>
            </tr>
            <tr>
              <td><strong>AI insights</strong></td>
              <td className="rent-col">Yes</td>
              <td>—</td>
              <td>—</td>
            </tr>
            <tr>
              <td><strong>PDF monthly statements</strong></td>
              <td className="rent-col">Auto-emailed</td>
              <td>DIY in Excel</td>
              <td>Manual export</td>
            </tr>
            <tr>
              <td><strong>Monthly subscription</strong></td>
              <td className="rent-col">$0</td>
              <td>$0</td>
              <td>$50–500+</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
    notes:
      "Walk this row by row. The PDF statement row is your strongest. The QuickBooks row is your second strongest. AI is your third. Pricing comes next. Common pushback: 'I'm already on Buildium' — respond: 'How much are you paying them per month? What do you actually use?' Most landlords use 20% of what Buildium offers.",
  },

  {
    id: 'pricing',
    background: 'white',
    content: (
      <>
        <div className="slide-eyebrow">Pricing</div>
        <h1 className="slide-title">No monthly fee.<br /><span className="ink-accent">8% per transaction.</span></h1>
        <ul className="bullet-list">
          <li><strong>No monthly subscription.</strong> No setup fee. No per-unit fee.</li>
          <li><strong>8% per rent payment</strong>, paid by you, taken at the moment of collection</li>
          <li><strong>Tenant pays Stripe processing</strong> (~2.9% card or much less for ACH) — that's their side, not ours</li>
          <li><strong>Funds settle directly to your bank in T+2</strong> — we never hold your money</li>
        </ul>
        <p className="slide-body" style={{ marginTop: 28, fontSize: 16, color: '#666' }}>
          On a $2,000 rent payment: $160 to us, $1,840 to your account. The math is the math.
        </p>
      </>
    ),
    notes:
      "Don't apologize for pricing. 8% sounds high until you compare to Buildium's $50/mo + per-unit fees + paid add-ons — at 3 units of $2k each, Buildium often costs MORE per month than us. Frame it: 'You pay zero in months you have no tenants. You pay zero if rent doesn't come in. Aligned incentive.' If they push back hard on 8%, your best counter: 'For our first customers we're willing to discuss pricing — what would feel fair to you?' Don't pre-discount; let them name a number.",
  },

  {
    id: 'early',
    background: 'dark',
    content: (
      <>
        <div className="pill">Why now</div>
        <h1 className="slide-title">Be one of our<br /><span className="ink-accent">first 10 customers.</span></h1>
        <ul className="bullet-list">
          <li><strong>Direct line to me</strong> — my cell number, response within hours, not tickets</li>
          <li><strong>Custom features added when you need them</strong> — tell me what's missing, I'll prioritize it</li>
          <li><strong>Your feedback shapes the roadmap</strong> — what we build next comes from real users, not focus groups</li>
          <li><strong>Locked-in pricing</strong> — when we raise rates later, you keep the rate you signed up at</li>
        </ul>
      </>
    ),
    notes:
      "This is your closer. Most prospects are skeptical of new software because they imagine getting stuck with bugs and no support. Flip that: 'You're not customer #1,247. You're customer #4. You text me, I answer. You need a feature, we build it.' Use specifics if you can: 'Last week one of our customers asked for [X] and we shipped it in 48 hours.' (Once you have a customer who's asked for something, this becomes a real story you can tell.)",
  },

  {
    id: 'cta',
    background: 'cream',
    content: (
      <>
        <h1 className="slide-title">Want to try it?</h1>
        <p className="slide-body" style={{ marginTop: 28 }}>
          Two ways from here:
        </p>
        <ul className="bullet-list">
          <li><strong>Set you up right now, live.</strong> 10 minutes. We add your first property, connect Stripe, invite your tenant. You can be collecting rent through Rentidge by end of day.</li>
          <li><strong>Send you a follow-up.</strong> A short email with the signup link and a couple of links to walk you through it. Set it up on your own time.</li>
        </ul>
        <p className="slide-body" style={{ marginTop: 32, fontSize: 18 }}>
          What works better for you?
        </p>
      </>
    ),
    notes:
      "Always close with a choice between two YES options, never a yes/no. 'Set up now' vs. 'follow-up email' is the right framing — both lead to them being a customer. If they pick 'follow-up,' get a commitment: 'Great. I'll send it tonight. Can we schedule a 10-minute check-in this Friday to make sure you got everything you need?' Calendar appointment > vague follow-up email any day.",
  },
]
