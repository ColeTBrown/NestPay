'use client'

// Soft animated gradient mesh used behind the hero. Pure CSS — three large
// blurred radial blobs (brand blue + warm peach + coral) drift across the
// canvas on long loops. No WebGL, no canvas, no JS.
//
// Tunables:
//   - Blob colors: rgba() values in the .rentidge-mesh-blob-* selectors below
//   - Blob opacity: opacity-{30|25|20} on each blob's className
//   - Drift speed: 60s / 75s / 90s on the animation: lines below
//   - Blur amount: blur-3xl utility = filter: blur(64px)
//
// Reduced-motion: animations disabled via the prefers-reduced-motion @media.
export default function GradientMesh() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="rentidge-mesh-blob rentidge-mesh-blob-blue absolute -top-40 -left-40 h-[60vw] w-[60vw] max-h-[760px] max-w-[760px] rounded-full blur-3xl opacity-30" />
      <div className="rentidge-mesh-blob rentidge-mesh-blob-peach absolute -bottom-40 -right-40 h-[55vw] w-[55vw] max-h-[680px] max-w-[680px] rounded-full blur-3xl opacity-25" />
      <div className="rentidge-mesh-blob rentidge-mesh-blob-coral absolute top-1/3 right-1/3 h-[40vw] w-[40vw] max-h-[480px] max-w-[480px] rounded-full blur-3xl opacity-20" />
      <style jsx global>{`
        .rentidge-mesh-blob-blue {
          background: radial-gradient(circle at center, rgba(56, 189, 248, 0.55) 0%, rgba(56, 189, 248, 0) 70%);
          animation: rentidge-drift-a 60s ease-in-out infinite;
        }
        .rentidge-mesh-blob-peach {
          background: radial-gradient(circle at center, rgba(255, 176, 136, 0.6) 0%, rgba(255, 176, 136, 0) 70%);
          animation: rentidge-drift-b 75s ease-in-out infinite;
        }
        .rentidge-mesh-blob-coral {
          background: radial-gradient(circle at center, rgba(248, 168, 154, 0.5) 0%, rgba(248, 168, 154, 0) 70%);
          animation: rentidge-drift-c 90s ease-in-out infinite;
        }
        @keyframes rentidge-drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(8vw, 6vh) scale(1.08); }
        }
        @keyframes rentidge-drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-6vw, -5vh) scale(1.12); }
        }
        @keyframes rentidge-drift-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-4vw, 4vh) scale(0.95); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rentidge-mesh-blob { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
