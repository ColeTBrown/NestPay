'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

// Scene 3 — Monthly performance.
//
// Story beats:
//   t=0     Stats cards count up to their targets (1.2s)
//   t=0.2s  Area chart sweeps in left-to-right (1.5s)
//
// Tunables:
//   - DATA — 6 months of fake collection data (in dollars)
//   - STATS — the 3 stat cards (label, value, suffix, deltaText)
//   - chart geometry: WIDTH/HEIGHT/PAD constants below

const DATA = [28100, 30200, 31800, 32600, 34000, 35400] // last 6 months $
const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']

type Stat = {
  id: string
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  deltaText?: string
  deltaTone?: 'up' | 'down' | 'neutral'
}

const STATS: Stat[] = [
  { id: 'total',     label: 'Total Collected',  value: 35400, prefix: '$',  deltaText: '↑ 12% vs Apr', deltaTone: 'up' },
  { id: 'occupancy', label: 'Occupancy',        value: 94,    suffix: '%',  deltaText: '12 of 12 leased', deltaTone: 'neutral' },
  { id: 'days',      label: 'Avg Days to Pay',  value: 1.2,   decimals: 1,  deltaText: '↓ 0.3 vs Apr', deltaTone: 'up' },
]

function useCount(target: number, durationMs: number, decimals: number, reduce: boolean | null) {
  const [v, setV] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce) { setV(target); return }
    let start: number | null = null
    let raf = 0
    const tick = (t: number) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      const factor = Math.pow(10, decimals)
      setV(Math.round(target * eased * factor) / factor)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, decimals, reduce])
  return v
}

function fmtNumber(n: number, decimals: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Build the SVG path for a smooth-ish area chart from raw values.
const WIDTH = 320
const HEIGHT = 110
const PAD_X = 6
const PAD_Y = 10

function buildPath() {
  const xs = DATA.map((_, i) => PAD_X + (i * (WIDTH - PAD_X * 2)) / (DATA.length - 1))
  const min = Math.min(...DATA)
  const max = Math.max(...DATA)
  const ys = DATA.map((d) => {
    const norm = (d - min) / (max - min || 1)
    return HEIGHT - PAD_Y - norm * (HEIGHT - PAD_Y * 2)
  })
  // Smooth via simple cubic-Bezier between points (Catmull-Rom-ish)
  let line = `M ${xs[0]} ${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const x0 = xs[i - 1], y0 = ys[i - 1], x1 = xs[i], y1 = ys[i]
    const cx = (x0 + x1) / 2
    line += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`
  }
  const area = `${line} L ${xs[xs.length - 1]} ${HEIGHT} L ${xs[0]} ${HEIGHT} Z`
  return { line, area, xs, ys, min, max }
}

export default function AccountingScene() {
  const reduce = useReducedMotion()
  const { line, area, xs, ys } = useRef(buildPath()).current

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-1">
            Accounting
          </div>
          <div
            className="text-[22px] leading-none text-zinc-900"
            style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
          >
            Monthly Performance
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400 font-medium">
            Synced to QuickBooks
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-sky-700 font-medium bg-sky-50 border border-sky-100 rounded-full px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Auto
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/60 p-3 mb-3">
        <div className="flex items-end justify-between mb-2 px-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
            Rent collected · last 6 months
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">↑ trending up</span>
        </div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-[110px] block" aria-hidden>
          <defs>
            <linearGradient id="rentidge-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </linearGradient>
            <clipPath id="rentidge-chart-clip">
              <motion.rect
                x="0"
                y="0"
                height={HEIGHT}
                initial={{ width: reduce ? WIDTH : 0 }}
                animate={{ width: WIDTH }}
                transition={{ duration: reduce ? 0 : 1.5, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : 0.2 }}
              />
            </clipPath>
          </defs>

          {/* Grid baseline */}
          <line x1={PAD_X} x2={WIDTH - PAD_X} y1={HEIGHT - PAD_Y} y2={HEIGHT - PAD_Y} stroke="#e4e4e7" strokeWidth="1" strokeDasharray="2 3" />

          <g clipPath="url(#rentidge-chart-clip)">
            <path d={area} fill="url(#rentidge-area-fill)" />
            <motion.path
              d={line}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduce ? 0 : 1.5, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : 0.2 }}
            />
          </g>

          {/* End-point dot */}
          <motion.circle
            cx={xs[xs.length - 1]}
            cy={ys[ys.length - 1]}
            r="3.5"
            fill="#fff"
            stroke="#0ea5e9"
            strokeWidth="2"
            initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 1.6 }}
          />
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between px-1 pt-1 text-[9px] text-zinc-400 tabular-nums">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        {STATS.map((s) => (
          <StatCard key={s.id} stat={s} reduce={reduce} />
        ))}
      </div>

      {/* Footer chip */}
      <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-zinc-400" /> All figures auto-reconciled
        </span>
        <span>May 11, 2026</span>
      </div>
    </div>
  )
}

function StatCard({ stat, reduce }: { stat: Stat; reduce: boolean | null }) {
  const decimals = stat.decimals ?? 0
  const v = useCount(stat.value, 1200, decimals, reduce)
  const deltaTone =
    stat.deltaTone === 'up' ? 'text-emerald-600' :
    stat.deltaTone === 'down' ? 'text-rose-600' : 'text-zinc-500'
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-[0.1em] text-zinc-400 font-semibold mb-1 truncate">
        {stat.label}
      </div>
      <div
        className="text-[18px] text-zinc-900 leading-none tabular-nums"
        style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
      >
        {stat.prefix ?? ''}{fmtNumber(v, decimals)}{stat.suffix ?? ''}
      </div>
      {stat.deltaText && (
        <div className={'text-[10px] mt-1 font-medium ' + deltaTone}>
          {stat.deltaText}
        </div>
      )}
    </div>
  )
}
