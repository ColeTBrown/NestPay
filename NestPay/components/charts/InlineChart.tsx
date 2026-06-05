'use client'
import React from 'react'

// Hand-rolled SVG charts so we don't ship 80kb of Recharts for two chart
// types. Supports two shapes:
//   { type: 'line', title?, data: [{ label, value }] }  — y is value, 0..100
//   { type: 'pie',  title?, data: [{ label, value }] }  — slice angles by share
//
// Parsed from <chart>{...}</chart> blocks the AI assistant emits.

export type ChartSpec =
  | { type: 'line'; title?: string; data: { label: string; value: number }[] }
  | { type: 'pie'; title?: string; data: { label: string; value: number }[] }

// Sky-blue accent + a few muted tones for pie slices. Order matters; first
// slice gets the accent.
const PIE_COLORS = ['#38BDF8', '#7DD3FC', '#3ecf8e', '#f5a623', '#fc6b6b', '#a78bfa', '#94A3B8']

export function InlineChart({ spec }: { spec: ChartSpec }) {
  if (spec.type === 'line') return <LineChart spec={spec} />
  if (spec.type === 'pie') return <PieChart spec={spec} />
  return null
}

function LineChart({ spec }: { spec: Extract<ChartSpec, { type: 'line' }> }) {
  const { title, data } = spec
  if (!data || data.length === 0) {
    return <div style={chartFrame}>{title ?? 'Chart'}: no data yet</div>
  }
  const w = 480, h = 180
  const padL = 36, padR = 12, padT = 16, padB = 28
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const maxY = 100 // assume 0..100 percent for occupancy
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW

  const points = data.map((d, i) => {
    const x = padL + i * stepX
    const y = padT + innerH - (Math.min(Math.max(d.value, 0), maxY) / maxY) * innerH
    return { x, y, ...d }
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath =
    `${path} L ${(points[points.length - 1].x).toFixed(1)},${(padT + innerH).toFixed(1)} L ${points[0].x.toFixed(1)},${(padT + innerH).toFixed(1)} Z`

  return (
    <div style={chartFrame}>
      {title && <div style={chartTitle}>{title}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={title ?? 'Line chart'}>
        {/* gridlines at 0/25/50/75/100 */}
        {[0, 25, 50, 75, 100].map(y => {
          const cy = padT + innerH - (y / maxY) * innerH
          return (
            <g key={y}>
              <line x1={padL} y1={cy} x2={w - padR} y2={cy} stroke="rgba(255,255,255,0.06)" />
              <text x={padL - 6} y={cy + 3} fill="#64748B" fontSize="9" textAnchor="end">{y}</text>
            </g>
          )
        })}
        {/* area fill */}
        <path d={areaPath} fill="rgba(56,189,248,0.12)" />
        {/* line */}
        <path d={path} fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#38BDF8" />
        ))}
        {/* x labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={h - 8} fill="#94A3B8" fontSize="9.5" textAnchor="middle">{p.label}</text>
        ))}
      </svg>
    </div>
  )
}

function PieChart({ spec }: { spec: Extract<ChartSpec, { type: 'pie' }> }) {
  const { title, data } = spec
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0)
  if (!data || data.length === 0 || total === 0) {
    return <div style={chartFrame}>{title ?? 'Chart'}: no data yet</div>
  }

  const w = 480, h = 180
  const cx = 90, cy = 90, r = 70
  let startAngle = -Math.PI / 2 // start at 12 o'clock

  const slices = data.map((d, i) => {
    const fraction = d.value / total
    const angle = fraction * Math.PI * 2
    const endAngle = startAngle + angle
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
    const color = PIE_COLORS[i % PIE_COLORS.length]
    const result = { path, color, label: d.label, value: d.value, fraction, startAngle, endAngle }
    startAngle = endAngle
    return result
  })

  return (
    <div style={chartFrame}>
      {title && <div style={chartTitle}>{title}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={title ?? 'Pie chart'}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#0F172A" strokeWidth="1.5" />
        ))}
        {/* legend */}
        <g transform="translate(190, 30)">
          {slices.map((s, i) => (
            <g key={i} transform={`translate(0, ${i * 22})`}>
              <rect width="12" height="12" rx="2" fill={s.color} />
              <text x="20" y="10" fill="#E2E8F0" fontSize="12">{s.label}</text>
              <text x="20" y="24" fill="#64748B" fontSize="10">{s.value} · {Math.round(s.fraction * 100)}%</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

const chartFrame: React.CSSProperties = {
  background: 'rgba(2,6,23,0.6)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 12,
  margin: '8px 0',
}
const chartTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text2)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

// Parses an AI-generated message string and returns an interleaved list of
// { kind: 'text', text } and { kind: 'chart', spec } segments. Malformed
// chart JSON is rendered as raw text so nothing silently disappears.
export type MessageSegment =
  | { kind: 'text'; text: string }
  | { kind: 'chart'; spec: ChartSpec }

export function parseAIMessage(content: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  const re = /<chart>([\s\S]*?)<\/chart>/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: content.slice(lastIndex, match.index) })
    }
    try {
      const parsed = JSON.parse(match[1]) as ChartSpec
      if (parsed && (parsed.type === 'line' || parsed.type === 'pie') && Array.isArray(parsed.data)) {
        segments.push({ kind: 'chart', spec: parsed })
      } else {
        segments.push({ kind: 'text', text: match[0] })
      }
    } catch {
      segments.push({ kind: 'text', text: match[0] })
    }
    lastIndex = re.lastIndex
  }
  if (lastIndex < content.length) {
    segments.push({ kind: 'text', text: content.slice(lastIndex) })
  }
  return segments
}
