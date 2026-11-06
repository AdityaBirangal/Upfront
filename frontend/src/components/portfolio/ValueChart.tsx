import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import type { ValuePoint } from '@/lib/portfolio.ts'

const HEIGHT = 240
const M = { top: 12, right: 16, bottom: 28, left: 60 }

/** Shows more decimals when the whole chart spans under a cent or so, as it does on a new holding. */
const usdt = (n: number, decimals = 2) =>
  n.toLocaleString([], { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

/**
 * Round ticks around the data, not from 0: a 10% gain has to be visible next to what was invested.
 * Padded a little either side, and never below 0.
 */
function niceTicks(lo: number, hi: number, count = 4): number[] {
  const range = hi - lo || Math.abs(hi) * 0.02 || 1
  const pad = range * 0.12
  const min = Math.max(0, lo - pad)
  const max = hi + pad
  const raw = (max - min) / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw
  const first = Math.floor(min / step)
  const last = Math.ceil(max / step)
  return Array.from({ length: last - first + 1 }, (_, i) => (first + i) * step)
}

/** Time labels sized to the span: clock time inside two days, dates beyond. */
function timeFormat(span: number) {
  if (span < 2 * 86_400) return (t: number) => new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (t: number) => new Date(t * 1000).toLocaleDateString([], { day: 'numeric', month: 'short' })
}

const fullTime = (t: number) =>
  new Date(t * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Portfolio value over time, with money invested as a gray line on the same USDT axis and the gain
 * shaded between them. The axis fits the data, so it doesn't start at 0. A crosshair snaps to the nearest moment and reads out both; arrow keys do the same.
 */
function ValueChart({ points, className }: { points: ValuePoint[]; className?: string }) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState<number | null>(null)

  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = HEIGHT - M.top - M.bottom
  const t0 = points[0]?.t ?? 0
  const t1 = points[points.length - 1]?.t ?? 1
  const span = Math.max(1, t1 - t0)
  const all = points.flatMap((p) => [p.value, p.invested])
  const yTicks = niceTicks(Math.min(...all), Math.max(...all))
  const yMin = yTicks[0]
  const yMax = yTicks[yTicks.length - 1]
  const tickStep = yTicks[1] - yTicks[0]
  const tickDecimals = Math.min(6, Math.max(0, Math.ceil(-Math.log10(tickStep) + 0.3)))
  const decimals = tickStep < 0.05 ? Math.min(6, tickDecimals + 1) : 2
  const x = (t: number) => M.left + ((t - t0) / span) * plotW
  const y = (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH
  const fmt = timeFormat(span)
  const tickCount = Math.max(2, Math.min(6, Math.floor(plotW / 110)))
  const xTicks = Array.from({ length: tickCount }, (_, i) => t0 + (span * i) / (tickCount - 1))

  const line = (key: 'value' | 'invested') =>
    points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join('')
  // The gain: the band between value and invested, read off the axis either way.
  const band = [...points]
    .reverse()
    .map((p) => `L${x(p.t).toFixed(1)},${y(p.invested).toFixed(1)}`)
    .join('')
  const gainBand = points.length ? `${line('value')}${band}Z` : ''

  function nearest(px: number) {
    const t = t0 + ((px - M.left) / plotW) * span
    let best = 0
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].t - t) < Math.abs(points[best].t - t)) best = i
    return best
  }

  function onMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    setActive(nearest(event.clientX - rect.left))
  }

  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const step = Math.max(1, Math.round(points.length / 40))
      const from = active ?? points.length - 1
      const next = from + (event.key === 'ArrowRight' ? step : -step)
      setActive(Math.min(points.length - 1, Math.max(0, next)))
    } else if (event.key === 'Escape') setActive(null)
  }

  const last = points[points.length - 1]
  const shown = active === null ? null : points[active]
  const tipLeft = shown ? Math.min(Math.max(x(shown.t), M.left + 70), width - 90) : 0

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Legend">
        <li className="inline-flex items-center gap-2">
          <span className="bg-primary h-0.5 w-4 rounded-full" aria-hidden />
          Value
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="bg-muted-foreground/60 h-0.5 w-4 rounded-full" aria-hidden />
          Invested
        </li>
      </ul>

      <div ref={ref} className="relative" style={{ height: HEIGHT }}>
        {width > 0 && points.length > 1 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            tabIndex={0}
            aria-label={`Portfolio value over time. Now ${usdt(last.value)} USDT, with ${usdt(last.invested)} USDT invested. Use the arrow keys to read earlier values.`}
            className="touch-none overflow-visible rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
          >
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
                <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground tabular text-[11px]">
                  {usdt(v, tickDecimals)}
                </text>
              </g>
            ))}
            {xTicks.map((t, i) => (
              <text
                key={t}
                x={x(t)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                className="fill-muted-foreground tabular text-[11px]"
              >
                {fmt(t)}
              </text>
            ))}

            <path d={gainBand} className="fill-primary" fillOpacity={0.14} />
            <path d={line('invested')} fill="none" className="stroke-muted-foreground/60" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={line('value')} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {shown ? (
              <g pointerEvents="none">
                <line x1={x(shown.t)} x2={x(shown.t)} y1={M.top} y2={M.top + plotH} className="stroke-foreground/30" strokeWidth={1} />
                <circle cx={x(shown.t)} cy={y(shown.invested)} r={4} className="fill-muted-foreground stroke-card" strokeWidth={2} />
                <circle cx={x(shown.t)} cy={y(shown.value)} r={4.5} className="fill-primary stroke-card" strokeWidth={2} />
              </g>
            ) : (
              <circle cx={x(last.t)} cy={y(last.value)} r={4.5} className="fill-primary stroke-card" strokeWidth={2} pointerEvents="none" />
            )}
          </svg>
        )}

        {shown && (
          <div
            className="bg-popover text-popover-foreground pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-lg border px-3 py-2 text-xs shadow-md"
            style={{ left: tipLeft }}
            role="status"
          >
            <p className="text-muted-foreground mb-1.5">{fullTime(shown.t)}</p>
            <p className="flex items-center gap-2">
              <span className="bg-primary h-0.5 w-3 rounded-full" aria-hidden />
              <span className="tabular text-sm font-semibold">{usdt(shown.value, decimals)}</span>
              <span className="text-muted-foreground ml-auto">Value</span>
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span className="bg-muted-foreground/60 h-0.5 w-3 rounded-full" aria-hidden />
              <span className="tabular font-medium">{usdt(shown.invested, decimals)}</span>
              <span className="text-muted-foreground ml-auto">Invested</span>
            </p>
            <p className="mt-1.5 flex items-center justify-between gap-2 border-t pt-1.5">
              <span className="tabular font-medium">
                {shown.value >= shown.invested ? '+' : '−'}
                {usdt(Math.abs(shown.value - shown.invested), decimals)}
              </span>
              <span className="text-muted-foreground">Gain</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ValueChart
