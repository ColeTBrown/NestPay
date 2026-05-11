'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// Fake-but-realistic Rentidge dashboard card for the hero. All data is
// hard-coded demo content; nothing hits a real API.
//
// Tunables:
//   - PROPERTIES below (names, units, tenants, amounts)
//   - LOOP_MS — how often the pending->paid + toast cycle fires
//   - tilt — perspective angle on the card
//   - card width — `max-w-[480px]` below
type Property = {
  id: string
  name: string
  unit: string
  tenant: string
  initials: string
  amount: number
}

const PROPERTIES: Property[] = [
  { id: 'a', name: '412 Maple Avenue', unit: 'Unit 2B', tenant: 'James S.', initials: 'JS', amount: 1950 },
  { id: 'b', name: '88 Oak Street',    unit: 'Unit 1',  tenant: 'Maria R.',  initials: 'MR', amount: 2200 },
  { id: 'c', name: '1700 Cedar Court', unit: 'Unit 5A', tenant: 'Alex T.',   initials: 'AT', amount: 1650 },
]

const LOOP_MS = 4000

function formatUSD(cents: number) {
  return cents.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function DashboardMockup() {
  const reduce = useReducedMotion()

  // The middle row cycles Pending -> Paid every LOOP_MS. When it flips to
  // Paid, the "collected" total ticks up by that row's amount; on reset we
  // subtract it back out so the loop is visually stable.
  const [middleStatus, setMiddleStatus] = useState<'pending' | 'paid'>('pending')
  const [showToast, setShowToast] = useState(false)
  const [count, setCount] = useState(0)

  // Animate property count 0 -> 3 on mount.
  useEffect(() => {
    if (reduce) {
      setCount(PROPERTIES.length)
      setMiddleStatus('paid')
      return
    }
    let n = 0
    const id = setInterval(() => {
      n += 1
      setCount(n)
      if (n >= PROPERTIES.length) clearInterval(id)
    }, 220)
    return () => clearInterval(id)
  }, [reduce])

  // Pending -> Paid loop + toast.
  useEffect(() => {
    if (reduce) return
    let cancelled = false
    const run = () => {
      if (cancelled) return
      setMiddleStatus('pending')
      setTimeout(() => {
        if (cancelled) return
        setMiddleStatus('paid')
        setShowToast(true)
        setTimeout(() => !cancelled && setShowToast(false), 2400)
      }, 1800)
    }
    run()
    const id = setInterval(run, LOOP_MS + 2000) // small buffer between cycles
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [reduce])

  const baseCollected = PROPERTIES[0].amount + PROPERTIES[2].amount
  const middleAmount = PROPERTIES[1].amount
  const collected = middleStatus === 'paid' ? baseCollected + middleAmount : baseCollected

  return (
    <div
      className="relative w-full max-w-[480px] mx-auto"
      style={{ perspective: '1400px' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, rotateY: 0 }}
        animate={{ opacity: 1, y: 0, rotateY: reduce ? 0 : -4 }}
        transition={{ duration: reduce ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : 0.35 }}
        className="relative rounded-2xl bg-white border border-[#e8e6e0] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.18),0_8px_24px_-8px_rgba(15,23,42,0.08)] overflow-hidden"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[#f0ede8] bg-[#fbfaf7]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f5a5a5]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f5d28a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#a8d8a8]" />
          <span className="ml-3 text-[11px] uppercase tracking-[0.12em] text-[#999] font-medium">
            Rentidge · Dashboard
          </span>
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#999] font-medium mb-1">
              Properties
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-[40px] leading-none text-[#1a1a1a] font-medium"
                style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-1px' }}
              >
                {count}
              </span>
              <span className="text-[13px] text-[#777]">active</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#999] font-medium mb-1">
              Collected this month
            </div>
            <motion.div
              key={collected}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-[22px] text-[#1a1a1a] font-medium"
              style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
            >
              {formatUSD(collected)}
            </motion.div>
          </div>
        </div>

        {/* Property rows */}
        <ul className="px-2 pb-4">
          {PROPERTIES.map((p, i) => {
            const isMiddle = i === 1
            const status: 'pending' | 'paid' = isMiddle ? middleStatus : 'paid'
            return (
              <li
                key={p.id}
                className="mx-4 px-2 py-3 flex items-center gap-3 border-b border-[#f4f1ec] last:border-b-0"
              >
                <div className="h-9 w-9 rounded-full bg-[#eef7fd] text-[#0284c7] flex items-center justify-center text-[12px] font-medium flex-shrink-0">
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[#1a1a1a] font-medium truncate">
                    {p.name}
                  </div>
                  <div className="text-[12px] text-[#888] truncate">
                    {p.unit} · {p.tenant}
                  </div>
                </div>
                <div className="text-[14px] text-[#1a1a1a] font-medium tabular-nums">
                  {formatUSD(p.amount)}
                </div>
                <StatusBadge status={status} />
              </li>
            )
          })}
        </ul>
      </motion.div>

      {/* Floating toast */}
      <AnimatePresence>
        {showToast && !reduce && (
          <motion.div
            initial={{ opacity: 0, y: -10, x: 10 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute -top-3 right-2 sm:right-[-12px] flex items-center gap-2.5 bg-white border border-[#e8e6e0] rounded-xl shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] px-3.5 py-2.5 z-10"
          >
            <span className="h-7 w-7 rounded-full bg-[#eafaf2] text-[#0a8a4a] flex items-center justify-center">
              <CheckIcon />
            </span>
            <div>
              <div className="text-[12px] text-[#1a1a1a] font-medium leading-tight">
                Rent received
              </div>
              <div className="text-[11px] text-[#777] leading-tight">
                Maria R. · {formatUSD(PROPERTIES[1].amount)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusBadge({ status }: { status: 'paid' | 'pending' }) {
  const isPaid = status === 'paid'
  return (
    <motion.span
      layout
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0 ' +
        (isPaid
          ? 'bg-[#eafaf2] text-[#0a8a4a]'
          : 'bg-[#fdf3e4] text-[#a3691b]')
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {isPaid ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center"
          >
            <CheckIcon small />
          </motion.span>
        ) : (
          <motion.span
            key="dot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-1.5 w-1.5 rounded-full bg-[#a3691b]"
          />
        )}
      </AnimatePresence>
      {isPaid ? 'Paid' : 'Pending'}
    </motion.span>
  )
}

function CheckIcon({ small = false }: { small?: boolean }) {
  const size = small ? 10 : 14
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7.5L5.5 10.5L11.5 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
