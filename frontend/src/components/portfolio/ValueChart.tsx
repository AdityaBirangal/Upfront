import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import type { ValuePoint } from '@/lib/portfolio.ts'

const HEIGHT = 240
const M = { top: 12, right: 16, bottom: 28, left: 52 }

const usdt = (n: number) => n.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Round ticks from 0 to just above `max`: 0 / 5 / 10 / 15. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
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
 * Portfolio value over time as an area, with money invested as a gray line on the same USDT axis.
 * A crosshair snaps to the nearest moment and reads out both; arrow keys do the same.
 */
function ValueChart({ points, className }: { points: ValuePoint[]; className?: string }) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState<number | null>(null)

  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = HEIGHT - M.top - M.bottom
  const t0 = points[0]?.t ?? 0
  const t1 = points[points.length - 1]?.t ?? 1
  const span = Math.max(1, t1 - t0)
  const yTicks = niceTicks(Math.max(...points.map((p) => Math.max(p.value, p.invested)), 0))
  const yMax = yTicks[yTicks.length - 1] || 1
  const x = (t: number) => M.left + ((t - t0) / span) * plotW
  const y = (v: number) => M.top + plotH - (v / yMax) * plotH
  const fmt = timeFormat(span)
  const tickCount = Math.max(2, Math.min(6, Math.floor(plotW / 110)))
  const xTicks = Array.from({ length: tickCount }, (_, i) => t0 + (span * i) / (tickCount - 1))

  const line = (key: 'value' | 'invested') =>
    points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join('')
  const area = points.length
    ? `${line('value')}L${x(t1).toFixed(1)},${y(0)}L${x(t0).toFixed(1)},${y(0)}Z`
    : ''

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
                  {v.toLocaleString([], { maximumFractionDigits: 2 })}
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

            <path d={area} className="fill-primary" fillOpacity={0.1} />
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
              <span className="tabular text-sm font-semibold">{usdt(shown.value)}</span>
              <span className="text-muted-foreground ml-auto">Value</span>
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span className="bg-muted-foreground/60 h-0.5 w-3 rounded-full" aria-hidden />
              <span className="tabular font-medium">{usdt(shown.invested)}</span>
              <span className="text-muted-foreground ml-auto">Invested</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ValueChart
