import { useEffect, useRef, useState } from 'react'
import { Building2, Check, Factory, Pause, Play } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Timeline ─────────────────────────────────────────────────────────────── */

const PHASES = [
  { key: 'sign', label: 'Sign', ms: 1600 },
  { key: 'verify', label: 'Verify', ms: 1500 },
  { key: 'tokenize', label: 'Tokenize', ms: 1700 },
  { key: 'fund', label: 'Fund', ms: 2600 },
  { key: 'build', label: 'Deliver', ms: 2200 },
  { key: 'repay', label: 'Client pays', ms: 1800 },
  { key: 'settle', label: 'Settle', ms: 2600 },
] as const
type PhaseKey = (typeof PHASES)[number]['key']

const HOLD = 1600

/** Illustrative deal: investors pay $90M today for $100M at the due date. */
const RAISED = 90
const GAIN = '+11%'
const STARTS = PHASES.reduce<number[]>((acc, _p, i) => [...acc, i === 0 ? 0 : acc[i - 1] + PHASES[i - 1].ms], [])
const TOTAL = STARTS[STARTS.length - 1] + PHASES[PHASES.length - 1].ms + HOLD
const START = Object.fromEntries(PHASES.map((p, i) => [p.key, STARTS[i]])) as Record<PhaseKey, number>
const DUR = Object.fromEntries(PHASES.map((p) => [p.key, p.ms])) as Record<PhaseKey, number>

/** Units are cobalt, money is green, the client's check is teal, returns are gold. */
const UNITS = 'var(--primary)'
const MONEY = 'var(--state-settled)'
const CHECK = 'var(--state-funded)'
const GOLD = 'var(--yield)'

const clamp = (v: number) => Math.min(Math.max(v, 0), 1)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

type Pt = { x: number; y: number }
type Cubic = [Pt, Pt, Pt, Pt]
const P = (x: number, y: number): Pt => ({ x, y })

const bezier = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
})
function along([a, b, c, d]: Cubic, t: number): Pt {
  const m = 1 - t
  return {
    x: m * m * m * a.x + 3 * m * m * t * b.x + 3 * m * t * t * c.x + t * t * t * d.x,
    y: m * m * m * a.y + 3 * m * m * t * b.y + 3 * m * t * t * c.y + t * t * t * d.y,
  }
}
const cubicPath = ([a, b, c, d]: Cubic) => `M${a.x} ${a.y}C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`
const quadPath = (a: Pt, c: Pt, b: Pt) => `M${a.x} ${a.y}Q${c.x} ${c.y} ${b.x} ${b.y}`
const flip = ([a, b, c, d]: Cubic): Cubic => [d, c, b, a]

/* ── Stage geometry: wide for desktop, portrait for phones ────────────────── */

type Geo = {
  viewBox: [number, number, number, number]
  compact: boolean
  client: Pt
  builder: Pt
  investors: Pt[]
  /** Client and business cards, and investor cards. */
  card: { w: number; h: number }
  inv: { w: number; h: number }
  doc: Pt
  units: Pt
  tileAt: (i: number) => Pt
  investorsLabel: Pt
  cash: Pt
  line: { x0: number; x1: number; y: number }
  /** The line from the client to the business, and from the business to each investor. */
  link: Cubic
  rail: (inv: Pt) => Cubic
  /** Control points for objects that fly in an arc. */
  c: { tick: Pt; doc: Pt; tile: Pt }
  tickFrom: Pt
  repayLabel: Pt & { anchor: 'middle' | 'start' }
}

const WIDE: Geo = (() => {
  const client = P(140, 205)
  const builder = P(480, 205)
  const investors = [100, 170, 240, 310].map((y) => P(830, y))
  const card = { w: 150, h: 60 }
  const inv = { w: 124, h: 50 }
  return {
    viewBox: [0, 50, 960, 410],
    compact: false,
    client,
    builder,
    investors,
    card,
    inv,
    doc: P(310, 205),
    units: P(640, 205),
    tileAt: (i) => ({ x: 830 - inv.w / 2 - 12 - Math.floor(i / 4) * 15, y: investors[i % 4].y }),
    investorsLabel: P(830, 360),
    cash: P(builder.x, builder.y - 70),
    line: { x0: client.x, x1: 830, y: 410 },
    link: [P(client.x + card.w / 2, 205), P(280, 205), P(340, 205), P(builder.x - card.w / 2, 205)],
    rail: (p) => [P(builder.x + card.w / 2, builder.y), P(650, builder.y), P(700, p.y), P(p.x - inv.w / 2, p.y)],
    c: { tick: P(220, 90), doc: P(470, 70), tile: P(735, 60) },
    tickFrom: P(client.x + 30, client.y - card.h / 2),
    repayLabel: { x: 310, y: 190, anchor: 'middle' },
  }
})()

const TALL: Geo = (() => {
  const client = P(200, 70)
  const builder = P(200, 300)
  const investors = [65, 155, 245, 335].map((x) => P(x, 540))
  const card = { w: 168, h: 56 }
  const inv = { w: 82, h: 56 }
  return {
    viewBox: [0, 0, 400, 650],
    compact: true,
    client,
    builder,
    investors,
    card,
    inv,
    doc: P(200, 185),
    units: P(200, 412),
    tileAt: (i) => ({ x: investors[i % 4].x + (Math.floor(i / 4) - 1) * 15, y: 540 - inv.h / 2 - 12 }),
    investorsLabel: P(200, 594),
    cash: P(58, builder.y),
    line: { x0: 30, x1: 370, y: 615 },
    link: [P(200, client.y + card.h / 2), P(200, 140), P(200, 230), P(200, builder.y - card.h / 2)],
    rail: (p) => [P(builder.x, builder.y + card.h / 2), P(builder.x, 450), P(p.x, 440), P(p.x, p.y - inv.h / 2)],
    c: { tick: P(330, 90), doc: P(340, 300), tile: P(330, 470) },
    tickFrom: P(client.x + card.w / 2, client.y),
    repayLabel: { x: 214, y: 190, anchor: 'start' },
  }
})()

const TILE = 16
const TILES = 12

const tileHome = (g: Geo, i: number): Pt => ({
  x: g.units.x - 2.5 * (TILE + 5) + (i % 6) * (TILE + 5),
  y: g.units.y - (TILE + 5) / 2 + Math.floor(i / 6) * (TILE + 5),
})

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function Card({
  at,
  size,
  icon: Icon,
  title,
  sub,
  tone,
  active,
  children,
}: {
  at: Pt
  size: { w: number; h: number }
  icon: LucideIcon
  title: string
  sub: string
  tone: string
  active: boolean
  children?: React.ReactNode
}) {
  const left = at.x - size.w / 2
  return (
    <g>
      <rect
        x={left}
        y={at.y - size.h / 2}
        width={size.w}
        height={size.h}
        rx={12}
        fill="var(--card)"
        stroke={active ? tone : 'var(--border)'}
        strokeWidth={active ? 1.5 : 1}
        style={{ transition: 'stroke 300ms' }}
      />
      <rect x={left + 12} y={at.y - 16} width={32} height={32} rx={8} fill={tone} fillOpacity={0.12} />
      <Icon x={left + 20} y={at.y - 8} width={16} height={16} color={tone} strokeWidth={2} />
      <text x={left + 54} y={at.y - 2} fontSize={14} fontWeight={600} fill="var(--foreground)">
        {title}
      </text>
      <text x={left + 54} y={at.y + 15} fontSize={11.5} fill="var(--muted-foreground)">
        {sub}
      </text>
      {children}
    </g>
  )
}

/** A line lighting up from its start, with a soft glowing head. */
function Trail({ d, p, tone, opacity = 1, head = true }: { d: string; p: number; tone: string; opacity?: number; head?: boolean }) {
  if (p <= 0 || opacity <= 0) return null
  return (
    <g opacity={opacity}>
      <path d={d} pathLength={1} fill="none" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeDasharray={`${p} 1`} strokeOpacity={0.75} />
      {head && p < 1 && (
        <path
          d={d}
          pathLength={1}
          fill="none"
          stroke={tone}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="0.07 1.2"
          strokeDashoffset={0.07 - p}
          opacity={0.4}
          filter="url(#flow-glow)"
        />
      )}
    </g>
  )
}

/** A glowing bead of money moving along a line. */
function Bead({ at, tone }: { at: Pt; tone: string }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <circle r={9} fill={tone} opacity={0.25} filter="url(#flow-glow)" />
      <circle r={4.5} fill={tone} stroke="var(--card)" strokeWidth={1.5} />
    </g>
  )
}

function Chip({ at, label, tone, size = 14 }: { at: Pt; label: string; tone: string; size?: number }) {
  const w = 22 + label.length * size * 0.62
  const h = size + 14
  return (
    <g transform={`translate(${at.x - w / 2} ${at.y - h / 2})`}>
      <rect width={w} height={h} rx={h / 2} fill="var(--card)" stroke={tone} strokeWidth={1.5} />
      <rect width={w} height={h} rx={h / 2} fill={tone} fillOpacity={0.1} />
      <text x={w / 2} y={h / 2 + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={700} fill={tone}>
        {label}
      </text>
    </g>
  )
}

const query = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches
const reducedMotion = () => query('(prefers-reduced-motion: reduce)')

/** Whether the screen is narrow enough for the portrait stage. */
function useNarrow() {
  const [narrow, setNarrow] = useState(() => query('(max-width: 639px)'))
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

/**
 * The idea in one loop: a contract is signed and verified, split into units, sold to investors
 * for USDT, the business does the work, the client pays, and every holder is paid out.
 */
function FlowAnimation({ className }: { className?: string }) {
  const [t, setT] = useState(() => (reducedMotion() ? START.settle + DUR.settle - 1 : 0))
  const [playing, setPlaying] = useState(() => !reducedMotion())
  const [visible, setVisible] = useState(true)
  const box = useRef<HTMLDivElement>(null)
  const g = useNarrow() ? TALL : WIDE

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!playing || !visible) return
    const clock = { last: performance.now(), frame: 0 }
    clock.frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(now - clock.last, 100)
      clock.last = now
      setT((prev) => (prev + dt) % TOTAL)
      clock.frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(clock.frame)
  }, [playing, visible])

  const p = (k: PhaseKey) => clamp((t - START[k]) / DUR[k])
  /** Fades a phase's trails out shortly after the phase ends. */
  const after = (k: PhaseKey) => 1 - clamp((t - START[k] - DUR[k]) / 500)
  const ps = p('sign')
  const pv = p('verify')
  const pt = p('tokenize')
  const pf = p('fund')
  const pb = p('build')
  const pr = p('repay')
  const pst = p('settle')
  const active = PHASES.findLastIndex((ph) => t >= START[ph.key])
  const phase = PHASES[active]?.key

  /* Contract document. */
  const docPos = bezier(g.doc, g.c.doc, g.units, ease(clamp(pt / 0.45)))
  const docIn = ease(ps)
  const docShrink = clamp((pt - 0.45) / 0.2)
  const docOpacity = docIn * (1 - docShrink)
  const docScale = lerp(0.85, 1, docIn) * lerp(1, 0.6, docShrink)
  const verified = pv > 0.85
  const tickTo = { x: g.doc.x + 30, y: g.doc.y - 40 }
  const tickP = ease(clamp(pv / 0.8))
  const tickPos = bezier(g.tickFrom, g.c.tick, tickTo, tickP)

  /* Business cash: raised, spent on the work, paid by the client, paid out. */
  const cash =
    t < START.fund
      ? 0
      : t < START.build
        ? RAISED * ease(pf)
        : t < START.repay
          ? RAISED * (1 - ease(pb))
          : t < START.settle
            ? 100 * ease(pr)
            : 100 * (1 - ease(pst))
  const repaid = t >= START.repay

  const marker = lerp(g.line.x0, g.line.x1, ease(pb))
  const tileFade = 1 - clamp((pst - 0.7) / 0.2)
  const gold = ease(clamp((pst - 0.55) / 0.3))
  const holding = pf > 0.6 && pst < 0.75
  const [vx, vy, vw, vh] = g.viewBox
  const rails = g.investors.map((inv) => g.rail(inv))
  const bLeft = g.builder.x - g.card.w / 2
  const bBottom = g.builder.y + g.card.h / 2

  return (
    <div ref={box} className={cn('relative', className)}>
      {/* Phase rail. */}
      <div className="flex items-center gap-3 pb-2">
        <ol className="grid flex-1 grid-cols-7 gap-1" aria-label="Steps">
          {PHASES.map((ph, i) => {
            const prog = i < active ? 1 : i === active ? p(ph.key) : 0
            return (
              <li key={ph.key} className="min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setT(START[ph.key] + ph.ms - 1)
                    setPlaying(false)
                  }}
                  className="group w-full rounded-md py-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-1"
                  aria-current={i === active ? 'step' : undefined}
                  aria-label={ph.label}
                >
                  <span className="bg-muted block h-0.5 overflow-hidden rounded-full">
                    <span
                      className={cn('block h-full rounded-full', i === PHASES.length - 1 ? 'bg-state-settled' : 'bg-primary')}
                      style={{ width: `${prog * 100}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      'mt-2 hidden truncate text-xs leading-none transition-colors sm:block',
                      i === active ? 'text-foreground font-semibold' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    {ph.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <span className="text-foreground w-20 truncate text-right text-xs font-semibold sm:hidden" aria-hidden>
          {PHASES[active]?.label}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-8 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>

      <svg
        viewBox={g.viewBox.join(' ')}
        className="block h-auto w-full select-none"
        role="img"
        aria-label="A signed contract is verified by the client, split into units, and sold to investors for USDT. The business does the work, the client pays, and the business pays every unit holder, who earn 11%."
      >
        <defs>
          <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <radialGradient id="flow-fade" cx="50%" cy="50%" r="62%">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <mask id="flow-mask">
            <rect x={vx} y={vy} width={vw} height={vh} fill="url(#flow-fade)" />
          </mask>
          <pattern id="flow-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="var(--border)" />
          </pattern>
        </defs>
        <rect x={vx} y={vy} width={vw} height={vh} fill="url(#flow-dots)" mask="url(#flow-mask)" />

        {/* The lines everything travels on, with a slow drift. */}
        <g fill="none" stroke="var(--border)" strokeWidth={1.5} strokeLinecap="round">
          <path d={cubicPath(g.link)} className="flow-line" />
          {rails.map((r, i) => (
            <path key={i} d={cubicPath(r)} className="flow-line" />
          ))}
        </g>

        {/* Lit routes for what's moving now. */}
        <Trail d={quadPath(g.tickFrom, g.c.tick, tickTo)} p={tickP} tone={CHECK} opacity={pv > 0 ? after('verify') : 0} />
        {rails.map((r, k) => (
          <Trail key={`fund${k}`} d={cubicPath(flip(r))} p={ease(clamp((pf - 0.1 - k * 0.04) / 0.5))} tone={MONEY} opacity={after('fund')} />
        ))}
        <Trail d={cubicPath(g.link)} p={ease(clamp(pr / 0.6))} tone={MONEY} opacity={after('repay')} />
        {rails.map((r, k) => (
          <Trail key={`settle${k}`} d={cubicPath(r)} p={ease(clamp((pst - k * 0.03) / 0.5))} tone={MONEY} opacity={after('settle') * (1 - gold * 0.6)} />
        ))}

        {/* Client. */}
        <Card
          at={g.client}
          size={g.card}
          icon={Building2}
          title="Client"
          sub="Pays at the end"
          tone={CHECK}
          active={phase === 'verify' || phase === 'repay'}
        />

        {/* Business, with a bar for the work. */}
        <Card
          at={g.builder}
          size={g.card}
          icon={Factory}
          title="Business"
          sub={pb > 0 && pb < 1 ? 'Doing the work' : 'Wins the contract'}
          tone="var(--primary)"
          active={phase === 'sign' || phase === 'build' || phase === 'settle'}
        >
          {pb > 0 && (
            <>
              <rect x={bLeft + 12} y={bBottom - 7} width={g.card.w - 24} height={3} rx={1.5} fill="var(--muted)" />
              <rect
                x={bLeft + 12}
                y={bBottom - 7}
                width={(g.card.w - 24) * ease(pb)}
                height={3}
                rx={1.5}
                fill={repaid ? MONEY : 'var(--primary)'}
              />
            </>
          )}
        </Card>
        <g opacity={cash > 0.4 ? 1 : 0} style={{ transition: 'opacity 300ms' }}>
          <Chip at={g.cash} label={`$${Math.round(cash)}M`} tone={repaid ? MONEY : 'var(--primary)'} size={g.compact ? 13 : 14} />
        </g>

        {/* Investors. */}
        {g.investors.map((inv, k) => {
          const left = inv.x - g.inv.w / 2
          const settled = gold > 0.05
          const status = settled ? `${GAIN} earned` : holding ? 'Holds units' : 'Investor'
          return (
            <g key={`${inv.x}-${inv.y}`}>
              <rect
                x={left}
                y={inv.y - g.inv.h / 2}
                width={g.inv.w}
                height={g.inv.h}
                rx={12}
                fill="var(--card)"
                stroke={settled ? GOLD : holding ? UNITS : 'var(--border)'}
                strokeOpacity={settled || holding ? 0.7 : 1}
                strokeWidth={settled ? 1.5 : 1}
                style={{ transition: 'stroke 300ms' }}
              />
              {g.compact ? (
                <>
                  <circle cx={inv.x} cy={inv.y - 9} r={11} fill={GOLD} fillOpacity={0.15} />
                  <text x={inv.x} y={inv.y - 5} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={GOLD}>
                    {'ABCD'[k]}
                  </text>
                  <text x={inv.x} y={inv.y + 18} textAnchor="middle" fontSize={settled ? 13 : 10.5} fontWeight={settled ? 800 : 500} fill={settled ? GOLD : 'var(--muted-foreground)'}>
                    {settled ? GAIN : holding ? 'Units' : 'Investor'}
                  </text>
                </>
              ) : (
                <>
                  <circle cx={left + 24} cy={inv.y} r={13} fill={GOLD} fillOpacity={0.15} />
                  <text x={left + 24} y={inv.y + 4.5} textAnchor="middle" fontSize={12} fontWeight={700} fill={GOLD}>
                    {'ABCD'[k]}
                  </text>
                  <text x={left + 46} y={inv.y - 3} fontSize={13} fontWeight={600} fill="var(--foreground)">
                    Investor {'ABCD'[k]}
                  </text>
                  <text x={left + 46} y={inv.y + 13} fontSize={11.5} fontWeight={settled ? 700 : 400} fill={settled ? GOLD : 'var(--muted-foreground)'}>
                    {status}
                  </text>
                </>
              )}
            </g>
          )
        })}
        <text
          x={g.investorsLabel.x}
          y={g.investorsLabel.y}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          letterSpacing="0.12em"
          fill="var(--muted-foreground)"
        >
          INVESTORS
        </text>

        {/* Contract. */}
        {docOpacity > 0.01 && (
          <g opacity={docOpacity} transform={`translate(${docPos.x} ${docPos.y}) scale(${docScale})`}>
            <rect x={-32} y={-42} width={64} height={84} rx={9} fill="var(--card)" stroke={verified ? CHECK : 'var(--foreground)'} strokeWidth={1.75} />
            {[0, 1, 2].map((l) => (
              <rect
                key={l}
                x={-20}
                y={-28 + l * 12}
                height={4}
                rx={2}
                width={40 * clamp((ps - 0.2 - l * 0.15) / 0.3) * (l === 2 ? 0.6 : 1)}
                fill="var(--muted-foreground)"
                opacity={0.45}
              />
            ))}
            <text y={28} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--foreground)">
              $100M
            </text>
            {verified && (
              <g transform="translate(30 -40)">
                <circle r={11} fill={CHECK} />
                <Check x={-6.5} y={-6.5} width={13} height={13} color="var(--card)" strokeWidth={3.5} />
              </g>
            )}
          </g>
        )}

        {/* Verify tick in flight. */}
        {pv > 0 && !verified && (
          <g transform={`translate(${tickPos.x} ${tickPos.y})`}>
            <circle r={11} fill={CHECK} />
            <Check x={-6.5} y={-6.5} width={13} height={13} color="var(--card)" strokeWidth={3.5} />
          </g>
        )}

        {/* Units. */}
        {Array.from({ length: TILES }, (_, i) => {
          const pop = ease(clamp((pt - 0.5 - (i % 6) * 0.04 - Math.floor(i / 6) * 0.06) / 0.25))
          if (pop <= 0) return null
          const fly = ease(clamp((pf - i * 0.035) / 0.5))
          const pos = bezier(tileHome(g, i), g.c.tile, g.tileAt(i), fly)
          const size = lerp(TILE, 12, fly) * pop
          return (
            <rect
              key={i}
              x={pos.x - size / 2}
              y={pos.y - size / 2}
              width={size}
              height={size}
              rx={3.5}
              fill={UNITS}
              stroke="var(--card)"
              strokeWidth={1}
              opacity={tileFade}
            />
          )
        })}

        {/* USDT from investors to the business, along the lines. */}
        {Array.from({ length: 8 }, (_, c) => {
          const lc = ease(clamp((pf - 0.12 - c * 0.05) / 0.45))
          if (lc <= 0 || lc >= 1) return null
          return <Bead key={c} at={along(flip(rails[c % 4]), lc)} tone={MONEY} />
        })}

        {/* The client pays the business. */}
        {Array.from({ length: 5 }, (_, c) => {
          const lc = ease(clamp((pr - c * 0.08) / 0.55))
          if (lc <= 0 || lc >= 1) return null
          return <Bead key={c} at={along(g.link, lc)} tone={MONEY} />
        })}
        <text
          x={g.repayLabel.x}
          y={g.repayLabel.y}
          textAnchor={g.repayLabel.anchor}
          fontSize={14}
          fontWeight={700}
          fill={MONEY}
          opacity={pr > 0 && pr < 1 ? Math.sin(pr * Math.PI) : 0}
        >
          $100M
        </text>

        {/* The business pays every holder. */}
        {Array.from({ length: 8 }, (_, c) => {
          const lc = ease(clamp((pst - c * 0.05) / 0.45))
          if (lc <= 0 || lc >= 1) return null
          return <Bead key={c} at={along(rails[c % 4], lc)} tone={MONEY} />
        })}

        {/* Day one to due date. */}
        <line x1={g.line.x0} y1={g.line.y} x2={g.line.x1} y2={g.line.y} stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />
        <line x1={g.line.x0} y1={g.line.y} x2={marker} y2={g.line.y} stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" />
        <circle cx={marker} cy={g.line.y} r={9} fill="var(--primary)" opacity={0.2} filter="url(#flow-glow)" />
        <circle cx={marker} cy={g.line.y} r={5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
        <text x={g.line.x0} y={g.line.y + 26} fontSize={12.5} fill="var(--muted-foreground)">
          Day 1
        </text>
        <text x={(g.line.x0 + g.line.x1) / 2} y={g.line.y + 26} fontSize={12.5} fill="var(--muted-foreground)" textAnchor="middle">
          12 months
        </text>
        <text x={g.line.x1} y={g.line.y + 26} fontSize={12.5} fill="var(--muted-foreground)" textAnchor="end">
          Due date
        </text>
      </svg>
    </div>
  )
}

export default FlowAnimation
