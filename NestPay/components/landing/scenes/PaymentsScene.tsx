'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

// Scene 1 — Payments dashboard.
//
// Story beats (active = scene is on screen):
//   t=0     KPI counts $0 → $3,900 (paid rows only) over ~1.5s
//   t=2.0s  Maria's row flips Pending → Paid; toast slides in;
//           KPI animates $3,900 → $5,850
//   t=3.5s  Toast fades out
//   (scene exits at ~5s, controlled by parent)
//
// Tunables:
//   - ROWS — names, properties, amounts
//   - The setTimeout delays inside useEffect (700ms / 2000ms / 3500ms)
//   - The KPI counter step size in the requestAnimationFrame loop

type Row = {
  id: string
  property: string
  unit: string
  tenant: string
  initials: string
  amount: number
  avatarBg: string
  avatarFg: string
  startsAs: 'paid' | 'pending'
}

const ROWS: Row[] = [
  {
    id: 'maria',
    property: '88 Oak Street',
    unit: 'Unit 1',
    tenant: 'Maria Chen',
    initials: 'MC',
    amount: 1950,
    avatarBg: 'bg-[#fde7d6]',
    avatarFg: 'text-[#a5491f]',
    startsAs: 'pending',
  },
  {
    id: 'james',
    property: '412 Maple Avenue',
    unit: 'Unit 2',
    tenant: 'James Rivera',
    initials: 'JR',
    amount: 2100,
    avatarBg: 'bg-[#dceefc]',
    avatarFg: 'text-[#0a5fa3]',
    startsAs: 'paid',
  },
  {
    id: 'priya',
    property: '6 Birch Lane',
    unit: 'Unit 3',
    tenant: 'Priya Patel',
    initials: 'PP',
    amount: 1800,
    avatarBg: 'bg-[#e6e1f7]',
    avatarFg: 'text-[#5a3aa1]',
    startsAs: 'paid',
  },
]

const PAID_BASELINE = ROWS.filter((r) => r.startsAs === 'paid').reduce((s, r) => s + r.amount, 0) // 3900
const PAID_FULL = ROWS.reduce((s, r) => s + r.amount, 0) // 5850

function useCounter(target: number, durationMs: number, reduce: boolean | null) {
  const [value, setValue] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce) {
      setValue(target)
      return
    }
    let start: number | null = null
    let raf = 0
    const from = 0
    const tick = (t: number) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / durationMs)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, reduce])
  return value
}

function useSpringTo(value: number, durationMs: number, reduce: boolean | null) {
  // Animates `value` whenever it changes. Used for the KPI tick-up after the
  // pending → paid flip.
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (reduce) {
      setShown(value)
      return
    }
    const from = shown
    const to = value
    let start: number | null = null
    let raf = 0
    const tick = (t: number) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs, reduce])
  return shown
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function PaymentsScene() {
  const reduce = useReducedMotion()
  const [mariaPaid, setMariaPaid] = useState(reduce ? true : false)
  const [showToast, setShowToast] = useState(false)

  // Initial count-up to baseline (paid-only sum).
  const baseline = useCounter(PAID_BASELINE, 1500, reduce)
  // Then animate to full once Maria flips.
  const target = mariaPaid ? PAID_FULL : PAID_BASELINE
  const kpi = useSpringTo(target, 600, reduce)

  useEffect(() => {
    if (reduce) {
      setShowToast(false)
      return
    }
    const flip = setTimeout(() => {
      setMariaPaid(true)
      setShowToast(true)
    }, 2000)
    const hide = setTimeout(() => setShowToast(false), 3800)
    return () => {
      clearTimeout(flip)
      clearTimeout(hide)
    }
  }, [reduce])

  // Show whichever counter is "live": the initial count-up before the flip,
  // and the spring after. The handoff happens at 1.5s, before the 2s flip.
  const displayed = mariaPaid ? kpi : baseline

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-1">
            This Month's Rent
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[32px] leading-none text-zinc-900 tabular-nums"
              style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-1px' }}
            >
              {fmt(displayed)}
            </span>
            <span className="text-[12px] text-zinc-500">collected</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400 font-medium">
            May 2026
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </div>
        </div>
      </div>

      {/* Rent rows */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {ROWS.map((row, i) => {
          const isPaid = row.id === 'maria' ? mariaPaid : row.startsAs === 'paid'
          return (
            <div
              key={row.id}
              className={
                'flex items-center gap-3 px-4 py-3 ' +
                (i < ROWS.length - 1 ? 'border-b border-zinc-100' : '')
              }
            >
              <div className={'h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ' + row.avatarBg + ' ' + row.avatarFg}>
                {row.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-zinc-900 font-medium truncate">
                  {row.property} · {row.unit}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{row.tenant}</div>
              </div>
              <div className="text-[13px] font-semibold text-zinc-900 tabular-nums">
                {fmt(row.amount)}
              </div>
              <StatusPill paid={isPaid} />
            </div>
          )
        })}
      </div>

      {/* Tiny footer chip */}
      <div className="mt-auto pt-4 flex items-center justify-between text-[10px] text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-zinc-400" /> Powered by Stripe
        </span>
        <span>2 of 3 paid</span>
      </div>

      {/* Toast — sits absolutely over the scene */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -16, x: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-3 right-3 z-10 flex items-center gap-2.5 bg-white border border-zinc-200 rounded-xl shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)] pl-2 pr-3 py-2 max-w-[260px]"
          >
            <span className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1.5 6h11" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-[12px] text-zinc-900 font-medium leading-tight">
                Rent received from Maria
              </div>
              <div className="text-[11px] text-zinc-500 leading-tight">
                {fmt(1950)} · 88 Oak Street
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusPill({ paid }: { paid: boolean }) {
  return (
    <motion.span
      layout
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium flex-shrink-0 border ' +
        (paid
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
          : 'bg-zinc-100 text-zinc-500 border-zinc-200')
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {paid ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="dot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-1.5 w-1.5 rounded-full bg-zinc-400"
          />
        )}
      </AnimatePresence>
      {paid ? 'Paid' : 'Pending'}
    </motion.span>
  )
}
