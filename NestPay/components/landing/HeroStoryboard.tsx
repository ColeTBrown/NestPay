'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// Auto-playing cinematic storyboard for the hero. A single phone frame cycles
// through 4 scenes that tell the Rentidge story end-to-end:
//
//   1. Tenant pays rent in two taps (couch / casual)
//   2. Tenant submits a maintenance request with a photo
//   3. Landlord sees everything land in real time — rent received,
//      maintenance ticket, QuickBooks auto-sync
//   4. Landlord asks the AI assistant a question and gets an instant answer
//
// Scenes cross-fade. The role label at the top of the phone swaps from
// "Maria · Tenant" to "Cole · Landlord" between scenes 2 and 3, with a soft
// background tint shift (warm for tenant, cool for landlord) to reinforce
// the perspective change.
//
// Tunables:
//   - SCENE_MS              — how long each scene lingers
//   - SCENES                — number of scenes (each has its own component)
//   - tilt                  — perspective angle on the phone
//   - phone width / height  — `w-[300px] h-[600px]` below
//   - PROPERTIES, AMOUNTS   — demo data inside each scene

const SCENE_MS = 5200
const SCENES = 4

export default function HeroStoryboard() {
  const reduce = useReducedMotion()
  const [scene, setScene] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduce || paused) return
    const id = setInterval(() => {
      setScene((s) => (s + 1) % SCENES)
    }, SCENE_MS)
    return () => clearInterval(id)
  }, [reduce, paused])

  const role: 'tenant' | 'landlord' = scene < 2 ? 'tenant' : 'landlord'

  return (
    <div
      className="relative w-full flex flex-col items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Halo glow behind phone — tints based on role */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[520px] rounded-full blur-3xl"
        animate={{
          background:
            role === 'tenant'
              ? 'radial-gradient(circle, rgba(255,176,136,0.35) 0%, rgba(255,176,136,0) 70%)'
              : 'radial-gradient(circle, rgba(56,189,248,0.32) 0%, rgba(56,189,248,0) 70%)',
        }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />

      {/* Phone */}
      <PhoneFrame role={role} reduce={reduce}>
        <AnimatePresence mode="wait">
          {scene === 0 && <TenantPayScene key="pay" reduce={reduce} />}
          {scene === 1 && <TenantRequestScene key="req" reduce={reduce} />}
          {scene === 2 && <LandlordDashScene key="land" reduce={reduce} />}
          {scene === 3 && <AIChatScene key="ai" reduce={reduce} />}
        </AnimatePresence>
      </PhoneFrame>

      {/* Caption */}
      <div className="mt-6 h-14 flex items-center justify-center text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="max-w-[360px]"
          >
            <div className="text-[13px] text-[#1a1a1a] font-medium leading-snug">
              {CAPTIONS[scene].title}
            </div>
            <div className="text-[12px] text-[#777] mt-0.5 leading-snug">
              {CAPTIONS[scene].sub}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: SCENES }).map((_, i) => (
          <button
            key={i}
            onClick={() => setScene(i)}
            aria-label={`Scene ${i + 1}`}
            className="group p-1.5"
          >
            <span
              className={
                'block h-1 rounded-full transition-all duration-500 ' +
                (i === scene
                  ? 'w-6 bg-[#1a1a1a]'
                  : 'w-1.5 bg-[#cfccc4] group-hover:bg-[#8a8780]')
              }
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Scene captions
// ----------------------------------------------------------------------

const CAPTIONS = [
  { title: 'Pay rent in two taps.',          sub: 'Maria pays from the couch — no portal logins, no checks.' },
  { title: 'Submit a maintenance request.',  sub: 'Snap a photo, add a note — done in 30 seconds.' },
  { title: 'Cole sees everything instantly.', sub: 'Rent landed, request filed, QuickBooks already in sync.' },
  { title: 'Ask the AI anything.',           sub: 'Daily briefings and instant answers across your whole portfolio.' },
]

// ----------------------------------------------------------------------
// Phone chrome
// ----------------------------------------------------------------------

function PhoneFrame({
  role,
  reduce,
  children,
}: {
  role: 'tenant' | 'landlord'
  reduce: boolean | null
  children: React.ReactNode
}) {
  return (
    <div
      className="relative"
      style={{ perspective: '1600px' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{
          opacity: 1,
          y: 0,
          rotateY: reduce ? 0 : role === 'tenant' ? -3 : 1,
          rotateX: reduce ? 0 : 2,
        }}
        transition={{ duration: reduce ? 0.2 : 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[300px] h-[600px] rounded-[42px] bg-[#0f1115] p-[10px] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35),0_12px_28px_-10px_rgba(15,23,42,0.18),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Side button highlight */}
        <span className="absolute -right-[2px] top-[140px] w-[3px] h-[70px] rounded-r-md bg-[#1c1f25]" />
        <span className="absolute -left-[2px] top-[110px] w-[3px] h-[28px] rounded-l-md bg-[#1c1f25]" />
        <span className="absolute -left-[2px] top-[150px] w-[3px] h-[54px] rounded-l-md bg-[#1c1f25]" />
        <span className="absolute -left-[2px] top-[214px] w-[3px] h-[54px] rounded-l-md bg-[#1c1f25]" />

        {/* Screen */}
        <div
          className="relative w-full h-full rounded-[32px] overflow-hidden"
          style={{
            background:
              role === 'tenant'
                ? 'linear-gradient(180deg, #fff7f0 0%, #ffffff 30%)'
                : 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 30%)',
          }}
        >
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-[26px] w-[100px] bg-[#0f1115] rounded-full z-30" />

          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-[42px] px-7 flex items-center justify-between text-[10px] font-medium text-[#1a1a1a] z-20">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <SignalIcon />
              <WifiIcon />
              <BatteryIcon />
            </span>
          </div>

          {/* Role pill */}
          <div className="absolute top-[44px] left-0 right-0 flex justify-center z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className={
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ' +
                  (role === 'tenant'
                    ? 'border-[#f3d6c2] bg-white/80 text-[#a5491f]'
                    : 'border-[#cfe3f5] bg-white/80 text-[#0a5fa3]')
                }
              >
                <span
                  className={
                    'h-1.5 w-1.5 rounded-full ' +
                    (role === 'tenant' ? 'bg-[#e07a3a]' : 'bg-[#38BDF8]')
                  }
                />
                {role === 'tenant' ? 'Maria · Tenant' : 'Cole · Landlord'}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Scene content area */}
          <div className="absolute inset-0 pt-[78px] pb-4 px-4">
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Scenes
// ----------------------------------------------------------------------

function TenantPayScene({ reduce }: { reduce: boolean | null }) {
  // Internal timeline: idle -> tapping -> processing -> paid
  const [stage, setStage] = useState<'idle' | 'tap' | 'processing' | 'paid'>(
    reduce ? 'paid' : 'idle',
  )

  useEffect(() => {
    if (reduce) return
    const t1 = setTimeout(() => setStage('tap'), 700)
    const t2 = setTimeout(() => setStage('processing'), 1500)
    const t3 = setTimeout(() => setStage('paid'), 2500)
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
    }
  }, [reduce])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="h-full flex flex-col"
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#999] font-medium mb-1">
        Good evening
      </div>
      <div
        className="text-[22px] text-[#1a1a1a] mb-4 leading-tight"
        style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
      >
        May rent is due
      </div>

      {/* Rent card */}
      <motion.div
        layout
        className="relative rounded-2xl border border-[#f0ddc8] bg-gradient-to-br from-[#fff5e9] to-[#fef0dd] p-4 mb-4 overflow-hidden"
      >
        <div className="text-[10px] uppercase tracking-[0.12em] text-[#a5491f] font-medium mb-1">
          88 Oak Street · Unit 1
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className="text-[34px] text-[#1a1a1a] leading-none"
            style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-1px' }}
          >
            $1,950
          </span>
          <span className="text-[11px] text-[#888]">due May 1</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[#666]">
          <SmallCard /> Visa ending 4242
        </div>

        {/* Processing shimmer */}
        <AnimatePresence>
          {stage === 'processing' && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
              className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Pay button */}
      <div className="relative">
        <motion.button
          animate={
            stage === 'idle'
              ? { scale: 1 }
              : stage === 'tap'
                ? { scale: [1, 0.96, 1] }
                : stage === 'paid'
                  ? { backgroundColor: '#10895a' }
                  : { scale: 1 }
          }
          transition={{ duration: 0.4 }}
          className="w-full py-3 rounded-xl bg-[#1a1a1a] text-white text-[14px] font-medium flex items-center justify-center gap-2"
        >
          <AnimatePresence mode="wait">
            {stage === 'paid' ? (
              <motion.span
                key="paid"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <CheckIcon /> Paid · $1,950
              </motion.span>
            ) : (
              <motion.span
                key="pay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Pay rent
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Tap pulse */}
        <AnimatePresence>
          {stage === 'tap' && (
            <motion.span
              initial={{ scale: 0.4, opacity: 0.7 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-[#38BDF8]"
            />
          )}
        </AnimatePresence>

        {/* Finger indicator */}
        <AnimatePresence>
          {stage === 'tap' && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute -right-1 -bottom-3 text-[26px]"
            >
              👆
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Below: Autopay note */}
      <div className="mt-auto pt-4 text-[10px] text-center text-[#999]">
        Autopay available · Powered by Stripe
      </div>
    </motion.div>
  )
}

function TenantRequestScene({ reduce }: { reduce: boolean | null }) {
  const fullTitle = 'Leaky kitchen faucet'
  const [typed, setTyped] = useState(reduce ? fullTitle : '')
  const [submitted, setSubmitted] = useState(reduce ? true : false)

  useEffect(() => {
    if (reduce) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(fullTitle.slice(0, i))
      if (i >= fullTitle.length) clearInterval(id)
    }, 60)
    const submit = setTimeout(() => setSubmitted(true), 2800)
    return () => { clearInterval(id); clearTimeout(submit) }
  }, [reduce])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="h-full flex flex-col"
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#999] font-medium mb-1">
        Maintenance
      </div>
      <div
        className="text-[20px] text-[#1a1a1a] mb-3 leading-tight"
        style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
      >
        Report an issue
      </div>

      {/* Title field */}
      <div className="rounded-xl border border-[#ece8e0] bg-white px-3 py-2.5 mb-2">
        <div className="text-[9px] uppercase tracking-[0.12em] text-[#aaa] font-medium mb-1">
          What's wrong?
        </div>
        <div className="text-[13px] text-[#1a1a1a] min-h-[18px]">
          {typed}
          {!reduce && typed.length < fullTitle.length && (
            <span className="inline-block w-[1px] h-[14px] bg-[#1a1a1a] ml-0.5 align-middle animate-pulse" />
          )}
        </div>
      </div>

      {/* Priority */}
      <div className="rounded-xl border border-[#ece8e0] bg-white px-3 py-2.5 mb-2">
        <div className="text-[9px] uppercase tracking-[0.12em] text-[#aaa] font-medium mb-1.5">
          Priority
        </div>
        <div className="flex gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f4f1ec] text-[#666]">Low</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#fef0dd] text-[#a5491f] border border-[#f3d6c2]">Normal</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f4f1ec] text-[#666]">Urgent</span>
        </div>
      </div>

      {/* Photo */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 1.2, duration: 0.4 }}
        className="rounded-xl border border-dashed border-[#d4cfc4] bg-[#fbfaf7] px-3 py-3 mb-3 flex items-center gap-2"
      >
        <span className="h-9 w-9 rounded-md bg-gradient-to-br from-[#cfd6dd] to-[#a4afbb] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 11l3-3 2 2 4-4 1 1v5H2z" fill="#fff" />
            <circle cx="5" cy="5" r="1" fill="#fff" />
          </svg>
        </span>
        <div className="flex-1">
          <div className="text-[12px] text-[#1a1a1a] font-medium">faucet.jpg</div>
          <div className="text-[10px] text-[#888]">attached</div>
        </div>
        <CheckIcon small />
      </motion.div>

      {/* Submit */}
      <button
        className={
          'w-full py-2.5 rounded-xl text-[13px] font-medium transition-colors ' +
          (submitted ? 'bg-[#10895a] text-white' : 'bg-[#1a1a1a] text-white')
        }
      >
        {submitted ? '✓ Sent to your landlord' : 'Submit request'}
      </button>

      <AnimatePresence>
        {submitted && !reduce && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-2 text-center text-[10px] text-[#10895a]"
          >
            Cole was notified
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function LandlordDashScene({ reduce }: { reduce: boolean | null }) {
  type Notif = { id: string; icon: 'cash' | 'wrench' | 'book'; title: string; sub: string; tint: string }
  const ALL: Notif[] = [
    { id: 'rent', icon: 'cash',   title: 'Rent received',     sub: 'Maria R. · $1,950',           tint: 'bg-[#eafaf2] text-[#0a8a4a] border-[#cdeedb]' },
    { id: 'mr',   icon: 'wrench', title: 'New maintenance',   sub: 'Leaky faucet · Unit 1',       tint: 'bg-[#fdf3e4] text-[#a5491f] border-[#f3d6c2]' },
    { id: 'qb',   icon: 'book',   title: 'QuickBooks synced', sub: 'Income entry created · Auto', tint: 'bg-[#eef5ff] text-[#0a5fa3] border-[#cfe3f5]' },
  ]

  const [shown, setShown] = useState<number>(reduce ? ALL.length : 0)

  useEffect(() => {
    if (reduce) return
    const ts = [400, 1200, 2000].map((d, i) =>
      setTimeout(() => setShown(i + 1), d),
    )
    return () => ts.forEach(clearTimeout)
  }, [reduce])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="h-full flex flex-col"
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#999] font-medium mb-1">
        Today
      </div>
      <div
        className="text-[20px] text-[#1a1a1a] mb-3 leading-tight"
        style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
      >
        Inbox
      </div>

      {/* Notification stack */}
      <div className="flex flex-col gap-2 mb-3">
        {ALL.map((n, i) => (
          <AnimatePresence key={n.id}>
            {shown > i && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={'rounded-xl border px-3 py-2.5 flex items-center gap-2.5 ' + n.tint}
              >
                <NotifIcon kind={n.icon} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium leading-tight">{n.title}</div>
                  <div className="text-[10px] opacity-80 leading-tight truncate">{n.sub}</div>
                </div>
                <CheckIcon small />
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Mini stat */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 2.4, duration: 0.4 }}
        className="mt-auto rounded-xl border border-[#ece8e0] bg-white px-3 py-3"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#999] font-medium">
            Collected this month
          </span>
          <span className="text-[10px] text-[#10895a] font-medium">+8% vs Apr</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-[22px] text-[#1a1a1a] leading-none tabular-nums"
            style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.5px' }}
          >
            $24,800
          </span>
          <span className="text-[11px] text-[#888]">/ $25,000</span>
        </div>
        {/* progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-[#f0ede8] overflow-hidden">
          <motion.div
            initial={reduce ? false : { width: 0 }}
            animate={{ width: '99.2%' }}
            transition={{ delay: reduce ? 0 : 2.7, duration: 0.9, ease: 'easeOut' }}
            className="h-full bg-[#38BDF8]"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function AIChatScene({ reduce }: { reduce: boolean | null }) {
  type Msg = { id: string; from: 'user' | 'ai'; text: string }
  const SCRIPT: Msg[] = [
    { id: 'q', from: 'user', text: "How's this month going?" },
    { id: 'a', from: 'ai',   text: 'On track — 11 of 12 units paid. Maria just covered May. The faucet ticket from Unit 1 is open; want me to dispatch your usual plumber?' },
  ]

  const [shown, setShown] = useState<number>(reduce ? SCRIPT.length : 0)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    if (reduce) return
    const t1 = setTimeout(() => setShown(1), 350)
    const t2 = setTimeout(() => setTyping(true), 900)
    const t3 = setTimeout(() => { setTyping(false); setShown(2) }, 2100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [reduce])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#38BDF8] to-[#0a5fa3] flex items-center justify-center text-white text-[11px] font-medium">
          R
        </span>
        <div>
          <div className="text-[13px] text-[#1a1a1a] font-medium leading-tight">
            Rentidge AI
          </div>
          <div className="text-[10px] text-[#10895a] leading-tight flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10895a]" /> Online
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        <AnimatePresence>
          {shown >= 1 && (
            <motion.div
              key="u"
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="self-end max-w-[78%] rounded-2xl rounded-br-md bg-[#1a1a1a] text-white px-3 py-2 text-[12px] leading-snug"
            >
              {SCRIPT[0].text}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {typing && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="self-start rounded-2xl rounded-bl-md bg-[#f4f1ec] px-3 py-2.5 flex items-center gap-1"
            >
              <Dot delay={0} />
              <Dot delay={0.15} />
              <Dot delay={0.3} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {shown >= 2 && (
            <motion.div
              key="a"
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="self-start max-w-[88%] rounded-2xl rounded-bl-md bg-[#f4f1ec] text-[#1a1a1a] px-3 py-2 text-[12px] leading-snug"
            >
              {SCRIPT[1].text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action chip */}
        <AnimatePresence>
          {shown >= 2 && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.4, duration: 0.35 }}
              className="self-start"
            >
              <button className="text-[11px] rounded-full border border-[#cfe3f5] bg-white text-[#0a5fa3] px-3 py-1 font-medium">
                Dispatch plumber →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="mt-2 rounded-xl border border-[#ece8e0] bg-white px-3 py-2 flex items-center gap-2">
        <span className="text-[11px] text-[#aaa] flex-1">Ask anything…</span>
        <span className="h-6 w-6 rounded-md bg-[#1a1a1a] flex items-center justify-center text-white">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </motion.div>
  )
}

// ----------------------------------------------------------------------
// Small bits
// ----------------------------------------------------------------------

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="h-1.5 w-1.5 rounded-full bg-[#999]"
      animate={{ y: [0, -3, 0] }}
      transition={{ repeat: Infinity, duration: 0.9, delay, ease: 'easeInOut' }}
    />
  )
}

function CheckIcon({ small = false }: { small?: boolean }) {
  const size = small ? 12 : 14
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SmallCard() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="17" height="13" rx="2" stroke="#bbb" />
      <rect y="3.5" width="18" height="2" fill="#bbb" />
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg width="14" height="9" viewBox="0 0 14 9" fill="currentColor" aria-hidden>
      <rect x="0" y="6" width="2" height="3" rx="0.5" />
      <rect x="4" y="4" width="2" height="5" rx="0.5" />
      <rect x="8" y="2" width="2" height="7" rx="0.5" />
      <rect x="12" y="0" width="2" height="9" rx="0.5" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg width="13" height="9" viewBox="0 0 13 9" fill="none" aria-hidden>
      <path d="M1 3.5C2.8 1.6 4.5 1 6.5 1s3.7 0.6 5.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 5.5C4.1 4.4 5.2 4 6.5 4s2.4 0.4 3.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="6.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg width="20" height="9" viewBox="0 0 20 9" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="16" height="8" rx="1.5" stroke="currentColor" />
      <rect x="2" y="2" width="12" height="5" rx="0.5" fill="currentColor" />
      <rect x="17.5" y="3" width="1.5" height="3" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function NotifIcon({ kind }: { kind: 'cash' | 'wrench' | 'book' }) {
  return (
    <span className="h-7 w-7 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
      {kind === 'cash' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      )}
      {kind === 'wrench' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M10 1l-3 3 1 1L5 8a2 2 0 102 2l3-3 1 1 3-3a4 4 0 01-4-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      )}
      {kind === 'book' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M2 2h7a2 2 0 012 2v8a2 2 0 00-2-2H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M7 4h3M7 6h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}
