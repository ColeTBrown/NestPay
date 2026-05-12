'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import PaymentsScene from './scenes/PaymentsScene'
import MaintenanceScene from './scenes/MaintenanceScene'
import AccountingScene from './scenes/AccountingScene'

// Mac-style device frame with three-light traffic dots that cycles through
// three product scenes (Payments, Maintenance, Accounting). Each scene
// plays for SCENE_MS, then cross-fades to the next over ~600ms.
//
// Tunables:
//   - SCENE_MS — how long each scene lingers
//   - tilt — rotateY/rotateX angles applied to the frame
//   - frame size — `aspect-[5/4] max-w-[560px]` below
//   - tab labels (Payments / Maintenance / Accounting)

const SCENE_MS = 5000
const SCENES = [
  { id: 'payments',    label: 'Payments',    Component: PaymentsScene,    chip: 'Dashboard' },
  { id: 'maintenance', label: 'Maintenance', Component: MaintenanceScene, chip: 'Tickets' },
  { id: 'accounting',  label: 'Accounting',  Component: AccountingScene,  chip: 'Reports' },
] as const

export default function HeroShowcase() {
  const reduce = useReducedMotion()
  const [scene, setScene] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduce || paused) return
    const id = setInterval(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS)
    return () => clearInterval(id)
  }, [reduce, paused])

  const Active = SCENES[scene].Component

  return (
    <div
      className="relative w-full flex flex-col items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Soft halo behind the device */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-[80px] blur-3xl opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(56,189,248,0.22) 0%, rgba(255,176,136,0.18) 40%, transparent 75%)',
        }}
      />

      {/* Device frame */}
      <div className="relative w-full max-w-[560px]" style={{ perspective: '1800px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, rotateY: reduce ? 0 : -3, rotateX: reduce ? 0 : 1.5 }}
          transition={{ duration: reduce ? 0.2 : 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full rounded-2xl bg-white border border-zinc-200/80 shadow-[0_50px_100px_-30px_rgba(15,23,42,0.30),0_18px_40px_-20px_rgba(15,23,42,0.18),0_2px_6px_rgba(15,23,42,0.06)] overflow-hidden"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] border border-[#dea123]/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] border border-[#1aab29]/30" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100/80 border border-zinc-200/70 px-2.5 py-1 text-[11px] text-zinc-600 max-w-[260px] truncate">
                <span className="text-zinc-400">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <rect x="2.5" y="4" width="5" height="4" rx="0.8" stroke="currentColor" strokeWidth="1" />
                    <path d="M3.5 4V3a1.5 1.5 0 013 0v1" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </span>
                <span className="font-medium text-zinc-700">app.rentidge.com</span>
                <span className="text-zinc-400">/{SCENES[scene].id}</span>
              </div>
            </div>
            <div className="w-12 flex justify-end">
              <span className="text-[10px] text-zinc-400 hidden sm:inline">9:41</span>
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-zinc-100 bg-white">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setScene(i)}
                className="relative group flex items-center gap-1.5 px-2.5 pb-2.5 text-[12px] font-medium transition-colors"
                aria-label={`View ${s.label} scene`}
              >
                <span className={i === scene ? 'text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-700'}>
                  {s.label}
                </span>
                <span className={
                  'text-[9px] uppercase tracking-[0.08em] rounded px-1 py-0.5 ' +
                  (i === scene ? 'bg-sky-50 text-sky-700' : 'bg-zinc-100 text-zinc-500')
                }>
                  {s.chip}
                </span>
                {i === scene && (
                  <motion.span
                    layoutId="rentidge-tab-underline"
                    className="absolute left-0 right-0 -bottom-px h-[2px] bg-zinc-900 rounded-t"
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1 pb-2.5">
              {SCENES.map((_, i) => (
                <span
                  key={i}
                  className={
                    'h-1 rounded-full transition-all duration-500 ' +
                    (i === scene ? 'w-6 bg-zinc-900' : 'w-1.5 bg-zinc-300')
                  }
                />
              ))}
            </div>
          </div>

          {/* Scene viewport */}
          <div className="relative bg-[#fafaf7] aspect-[5/4] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={SCENES[scene].id}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.005 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 p-5 sm:p-6"
              >
                <Active />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Reflection / floor shadow */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bottom-[-30px] w-[80%] h-[40px] rounded-full blur-2xl opacity-40 bg-zinc-900/30"
        />
      </div>

      {/* Sub-caption that swaps with the scene */}
      <div className="mt-7 h-10 flex items-center justify-center text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={SCENES[scene].id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="text-[12px] text-zinc-500 max-w-[460px]"
          >
            {scene === 0 && 'Rent payments land in real time. Receipts and reconciliation are automatic.'}
            {scene === 1 && 'Tenants submit requests. You triage from one board.'}
            {scene === 2 && 'Every dollar synced to QuickBooks. Reports ready when you need them.'}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
