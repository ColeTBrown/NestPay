'use client'

// Soft animated gradient mesh used behind the hero. Two large radial gradients
// (brand blue + warm peach) drift slowly on a long loop. Animation is killed
// when the user prefers reduced motion.
//
// Tunables you might want to tweak:
//   - blob colors (BLUE / PEACH constants below)
//   - blob opacity (the alpha values in the rgba()s)
//   - drift speed (the `60s` / `75s` durations below)
//   - blur amount (the `blur-3xl` utility = filter: blur(64px))
export default function GradientMesh() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Brand blue blob, top-left */}
      <div
        className="absolute -top-40 -left-40 h-[60vw] w-[60vw] max-h-[720px] max-w-[720px] rounded-full blur-3xl opacity-30 motion-safe:animate-[mesh-drift-a_60s_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(56,189,248,0.55) 0%, rgba(56,189,248,0) 70%)',
        }}
      />
      {/* Warm peach blob, bottom-right */}
      <div
        className="absolute -bottom-32 -right-32 h-[55vw] w-[55vw] max-h-[640px] max-w-[640px] rounded-full blur-3xl opacity-25 motion-safe:animate-[mesh-drift-b_75s_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,176,136,0.6) 0%, rgba(255,176,136,0) 70%)',
        }}
      />
      {/* Mid-tone coral, center-right for extra depth */}
      <div
        className="absolute top-1/3 right-1/4 h-[40vw] w-[40vw] max-h-[480px] max-w-[480px] rounded-full blur-3xl opacity-20 motion-safe:animate-[mesh-drift-c_90s_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(248,168,154,0.5) 0%, rgba(248,168,154,0) 70%)',
        }}
      />
      <style jsx global>{`
        @keyframes mesh-drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(8vw, 6vh) scale(1.08); }
        }
        @keyframes mesh-drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-6vw, -5vh) scale(1.12); }
        }
        @keyframes mesh-drift-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-4vw, 4vh) scale(0.95); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*='animate-[mesh-drift'] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
