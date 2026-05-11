'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

// Scene 2 — Maintenance kanban.
//
// Story beats:
//   t=1.0s  "Leaking faucet" card slides New → In Progress (motion layoutId)
//   t=2.5s  "Garbage disposal" card slides In Progress → Resolved
//
// Tunables:
//   - INITIAL_BOARD — ticket data and starting columns
//   - The setTimeout delays inside useEffect

type Priority = 'low' | 'med' | 'high'
type Column = 'new' | 'inprogress' | 'resolved'

type Ticket = {
  id: string
  title: string
  unit: string
  initials: string
  avatarTone: 'blue' | 'peach' | 'purple' | 'sage'
  age: string
  priority: Priority
  column: Column
}

const INITIAL_BOARD: Ticket[] = [
  { id: 'leak',    title: 'Leaking faucet',         unit: 'Unit 2B', initials: 'EM', avatarTone: 'peach',  age: '2h ago',  priority: 'med',  column: 'new' },
  { id: 'ac',      title: 'AC not cooling',         unit: 'Unit 4A', initials: 'TR', avatarTone: 'blue',   age: '4h ago',  priority: 'high', column: 'new' },
  { id: 'garbage', title: 'Garbage disposal jammed', unit: 'Unit 1C', initials: 'JN', avatarTone: 'purple', age: 'Yesterday', priority: 'med', column: 'inprogress' },
  { id: 'hall',    title: 'Hallway light out',      unit: 'Common',  initials: 'BG', avatarTone: 'sage',   age: 'Yesterday', priority: 'low', column: 'inprogress' },
  { id: 'smoke',   title: 'Smoke detector beeping', unit: 'Unit 3B', initials: 'KS', avatarTone: 'blue',   age: '3d ago',  priority: 'low',  column: 'resolved' },
]

const TONES: Record<Ticket['avatarTone'], string> = {
  blue:   'bg-[#dceefc] text-[#0a5fa3]',
  peach:  'bg-[#fde7d6] text-[#a5491f]',
  purple: 'bg-[#e6e1f7] text-[#5a3aa1]',
  sage:   'bg-[#dff0e1] text-[#236b3a]',
}

const PRIORITY_STYLE: Record<Priority, string> = {
  low:  'bg-zinc-100 text-zinc-600 border-zinc-200',
  med:  'bg-amber-50 text-amber-700 border-amber-100',
  high: 'bg-rose-50 text-rose-700 border-rose-100',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  med: 'Med',
  high: 'High',
}

const COLUMN_LABELS: Record<Column, { title: string; tone: string }> = {
  new:        { title: 'New',         tone: 'text-zinc-500' },
  inprogress: { title: 'In Progress', tone: 'text-amber-600' },
  resolved:   { title: 'Resolved',    tone: 'text-emerald-600' },
}

export default function MaintenanceScene() {
  const reduce = useReducedMotion()
  const [board, setBoard] = useState<Ticket[]>(() =>
    reduce
      ? INITIAL_BOARD.map((t) =>
          t.id === 'leak' ? { ...t, column: 'inprogress' } :
          t.id === 'garbage' ? { ...t, column: 'resolved' } : t,
        )
      : INITIAL_BOARD,
  )

  useEffect(() => {
    if (reduce) return
    const t1 = setTimeout(() => {
      setBoard((b) => b.map((t) => (t.id === 'leak' ? { ...t, column: 'inprogress' } : t)))
    }, 1000)
    const t2 = setTimeout(() => {
      setBoard((b) => b.map((t) => (t.id === 'garbage' ? { ...t, column: 'resolved' } : t)))
    }, 2500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [reduce])

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-medium mb-1">
            Maintenance
          </div>
          <div
            className="text-[22px] leading-none text-zinc-900"
            style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
          >
            Maintenance Requests
          </div>
        </div>
        <div className="text-[11px] text-zinc-500">
          {board.filter((t) => t.column !== 'resolved').length} open
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
        {(['new', 'inprogress', 'resolved'] as Column[]).map((col) => {
          const tickets = board.filter((t) => t.column === col)
          const meta = COLUMN_LABELS[col]
          return (
            <div key={col} className="flex flex-col min-w-0">
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className={'text-[10px] uppercase tracking-[0.12em] font-semibold ' + meta.tone}>
                  {meta.title}
                </span>
                <span className="text-[10px] text-zinc-400 tabular-nums">{tickets.length}</span>
              </div>
              <div className="flex-1 flex flex-col gap-1.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70 p-1.5 min-h-0">
                {tickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} reduce={reduce} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer chip */}
      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          Auto-routing tickets
        </span>
        <span>Updated just now</span>
      </div>
    </div>
  )
}

function TicketCard({ ticket, reduce }: { ticket: Ticket; reduce: boolean | null }) {
  return (
    <motion.div
      layoutId={ticket.id}
      layout
      transition={{
        layout: reduce ? { duration: 0 } : { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
      }}
      className="rounded-lg bg-white border border-zinc-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-2"
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span
          className={
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[9px] font-semibold uppercase tracking-[0.06em] border ' +
            PRIORITY_STYLE[ticket.priority]
          }
        >
          {PRIORITY_LABEL[ticket.priority]}
        </span>
        <span className="text-[9px] text-zinc-400">{ticket.age}</span>
      </div>
      <div className="text-[11px] text-zinc-900 font-medium leading-tight mb-0.5 line-clamp-2">
        {ticket.title}
      </div>
      <div className="text-[10px] text-zinc-500 mb-2 truncate">{ticket.unit}</div>
      <div className="flex items-center justify-between">
        <span className={'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-semibold ' + TONES[ticket.avatarTone]}>
          {ticket.initials}
        </span>
        <span className="text-zinc-300">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </motion.div>
  )
}
