import { useEffect, useRef, useState } from 'react'
import { Building2, Factory, Pause, Play, User } from 'lucide-react'
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

const clamp = (v: number) => Math.min(Math.max(v, 0), 1)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
type Pt = { x: number; y: number }
const bezier = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
})

/* ── Stage geometry: wide for desktop, portrait for phones ────────────────── */

type Geo = {
  viewBox: [number, number, number, number]
  client: Pt
  builder: Pt
  investors: Pt[]
  doc: Pt
  units: Pt
  tileAt: (i: number) => Pt
  clientLabel: Pt & { anchor: 'middle' | 'start' }
  builderLabel: Pt & { anchor: 'middle' | 'start' }
  investorsLabel: Pt
  cash: Pt
  gain: (inv: Pt) => Pt & { anchor: 'middle' | 'start' }
  line: { x0: number; x1: number; y: number }
  /** Bezier control points for each flight. */
  c: { tick: Pt; doc: Pt; tile: Pt; fund: Pt; repay: Pt; settle: Pt; repayLabel: Pt }
  rail: (inv: Pt) => string
}

const WIDE: Geo = (() => {
  const client = { x: 140, y: 205 }
  const builder = { x: 480, y: 205 }
  const investors = [100, 170, 240, 310].map((y) => ({ x: 830, y }))
  return {
    viewBox: [0, 50, 960, 410],
    client,
    builder,
    investors,
    doc: { x: 310, y: 205 },
    units: { x: 620, y: 205 },
    tileAt: (i) => ({ x: 830 - 38 - Math.floor(i / 4) * 15, y: investors[i % 4].y }),
    clientLabel: { x: client.x, y: client.y + 72, anchor: 'middle' },
    builderLabel: { x: builder.x, y: builder.y + 80, anchor: 'middle' },
    investorsLabel: { x: 830, y: 360 },
    cash: { x: builder.x, y: builder.y - 88 },
    gain: (inv) => ({ x: inv.x + 32, y: inv.y + 7, anchor: 'start' }),
    line: { x0: client.x, x1: 830, y: 410 },
    c: {
      tick: { x: 220, y: 70 },
      doc: { x: 465, y: 70 },
      tile: { x: 730, y: 60 },
      fund: { x: 660, y: 360 },
      repay: { x: 310, y: 300 },
      settle: { x: 680, y: 380 },
      repayLabel: { x: 310, y: 292 },
    },
    rail: (inv) => `M ${builder.x + 50} ${builder.y} C 640 ${builder.y}, 700 ${inv.y}, ${inv.x - 70} ${inv.y}`,
  }
})()

const TALL: Geo = (() => {
  const client = { x: 200, y: 70 }
  const builder = { x: 200, y: 300 }
  const investors = [65, 155, 245, 335].map((x) => ({ x, y: 540 }))
  return {
    viewBox: [0, 0, 400, 650],
    client,
    builder,
    investors,
    doc: { x: 200, y: 185 },
    units: { x: 200, y: 412 },
    tileAt: (i) => ({ x: investors[i % 4].x + (Math.floor(i / 4) - 1) * 15, y: 540 - 40 }),
    clientLabel: { x: client.x + 58, y: client.y + 5, anchor: 'start' },
    builderLabel: { x: builder.x + 66, y: builder.y + 5, anchor: 'start' },
    investorsLabel: { x: 200, y: 594 },
    cash: { x: 80, y: builder.y },
    gain: (inv) => ({ x: inv.x, y: inv.y - 32, anchor: 'middle' }),
    line: { x0: 30, x1: 370, y: 615 },
    c: {
      tick: { x: 330, y: 90 },
      doc: { x: 340, y: 300 },
      tile: { x: 330, y: 470 },
      fund: { x: 60, y: 420 },
      repay: { x: 60, y: 185 },
      settle: { x: 340, y: 420 },
      repayLabel: { x: 88, y: 190 },
    },
    rail: (inv) => `M ${builder.x} ${builder.y + 50} C ${builder.x} 440, ${inv.x} 440, ${inv.x} ${inv.y - 56}`,
  }
})()

const TILE = 16
const TILES = 12

const tileHome = (g: Geo, i: number): Pt => ({
  x: g.units.x - 2.5 * (TILE + 5) + (i % 6) * (TILE + 5),
  y: g.units.y - (TILE + 5) / 2 + Math.floor(i / 6) * (TILE + 5),
})

function Coin({ at, fill, ink }: { at: Pt; fill: string; ink: string }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <circle r={9} fill={fill} />
      <text y={3.6} textAnchor="middle" fontSize={11} fontWeight={700} fill={ink}>
        $
      </text>
    </g>
  )
}

function Tick({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <circle r={11} fill="var(--state-settled)" />
      <path d="M -5 0 L -1.5 3.5 L 5 -3.5" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function Label({ at, children }: { at: Pt & { anchor?: 'middle' | 'start' }; children: React.ReactNode }) {
  return (
    <text x={at.x} y={at.y} textAnchor={at.anchor ?? 'middle'} fontSize={15} fontWeight={600} fill="var(--foreground)">
      {children}
    </text>
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
 * for USDT, the builder builds, the client pays, and every holder is paid out.
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
      const dt = now - clock.last
      clock.last = now
      setT((prev) => (prev + dt) % TOTAL)
      clock.frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(clock.frame)
  }, [playing, visible])

  const p = (k: PhaseKey) => clamp((t - START[k]) / DUR[k])
  const ps = p('sign')
  const pv = p('verify')
  const pt = p('tokenize')
  const pf = p('fund')
  const pb = p('build')
  const pr = p('repay')
  const pst = p('settle')
  const active = PHASES.findLastIndex((ph) => t >= START[ph.key])

  /* Contract document. */
  const docPos = bezier(g.doc, g.c.doc, g.units, ease(clamp(pt / 0.45)))
  const docIn = ease(ps)
  const docShrink = clamp((pt - 0.45) / 0.2)
  const docOpacity = docIn * (1 - docShrink)
  const docScale = lerp(0.85, 1, docIn) * lerp(1, 0.6, docShrink)
  const verified = pv > 0.85
  const tickPos = bezier(
    { x: g.client.x + 30, y: g.client.y - 30 },
    g.c.tick,
    { x: g.doc.x + 30, y: g.doc.y - 40 },
    ease(clamp(pv / 0.8)),
  )

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
  const settledTone = pst > 0.35
  const tileFade = 1 - clamp((pst - 0.7) / 0.2)
  const gold = ease(clamp((pst - 0.55) / 0.3))
  const [vx, vy, vw, vh] = g.viewBox

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
                  <span className="bg-muted block h-1 overflow-hidden rounded-full">
                    <span
                      className={cn('block h-full rounded-full', i === PHASES.length - 1 ? 'bg-state-settled' : 'bg-primary')}
                      style={{ width: `${prog * 100}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      'mt-1.5 hidden truncate text-xs leading-none transition-colors sm:block',
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
          <radialGradient id="flow-fade" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <mask id="flow-mask">
            <rect x={vx} y={vy} width={vw} height={vh} fill="url(#flow-fade)" />
          </mask>
          <pattern id="flow-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--border)" />
          </pattern>
        </defs>
        <rect x={vx} y={vy} width={vw} height={vh} fill="url(#flow-dots)" mask="url(#flow-mask)" />

        {/* Rails. */}
        <g stroke="var(--border)" strokeWidth={1.5} strokeDasharray="4 6" fill="none">
          <line x1={g.client.x} y1={g.client.y} x2={g.builder.x} y2={g.builder.y} />
          {g.investors.map((inv) => (
            <path key={`${inv.x}-${inv.y}`} d={g.rail(inv)} />
          ))}
        </g>

        {/* Client. */}
        <circle cx={g.client.x} cy={g.client.y} r={44} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
        <circle
          cx={g.client.x}
          cy={g.client.y}
          r={44 + 12 * clamp(pv / 0.4)}
          fill="none"
          stroke="var(--state-settled)"
          strokeWidth={2}
          opacity={pv > 0 && pv < 0.4 ? 1 - pv / 0.4 : 0}
        />
        <Building2 x={g.client.x - 15} y={g.client.y - 15} width={30} height={30} color="var(--foreground)" strokeWidth={1.75} />
        <Label at={g.clientLabel}>Client</Label>

        {/* Business, with a ring for the work. */}
        <circle cx={g.builder.x} cy={g.builder.y} r={44} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
        <circle
          cx={g.builder.x}
          cy={g.builder.y}
          r={52}
          fill="none"
          stroke={repaid ? 'var(--state-settled)' : 'var(--primary)'}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 52 * ease(pb)} 999`}
          transform={`rotate(-90 ${g.builder.x} ${g.builder.y})`}
          opacity={pb > 0 ? 1 : 0}
        />
        <Factory x={g.builder.x - 15} y={g.builder.y - 15} width={30} height={30} color="var(--foreground)" strokeWidth={1.75} />
        <Label at={g.builderLabel}>Business</Label>
        <g opacity={cash > 0.4 ? 1 : 0} style={{ transition: 'opacity 300ms' }}>
          <rect
            x={g.cash.x - 46}
            y={g.cash.y - 16}
            width={92}
            height={32}
            rx={16}
            fill={repaid ? 'var(--state-settled)' : 'var(--primary)'}
          />
          <text x={g.cash.x} y={g.cash.y + 6} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--primary-foreground)">
            ${Math.round(cash)}M
          </text>
        </g>

        {/* Investors. */}
        {g.investors.map((inv) => {
          const gain = g.gain(inv)
          return (
            <g key={`${inv.x}-${inv.y}`}>
              <circle
                cx={inv.x}
                cy={inv.y}
                r={22}
                fill="var(--card)"
                stroke={gold > 0.05 ? 'var(--state-settled)' : 'var(--border)'}
                strokeWidth={gold > 0.05 ? 2.5 : 1.5}
              />
              <User x={inv.x - 10} y={inv.y - 10} width={20} height={20} color="var(--foreground)" strokeWidth={1.75} />
              <text x={gain.x} y={gain.y} textAnchor={gain.anchor} fontSize={20} fontWeight={800} fill="var(--state-settled)" opacity={gold}>
                {GAIN}
              </text>
            </g>
          )
        })}
        <Label at={g.investorsLabel}>Investors</Label>

        {/* Contract. */}
        {docOpacity > 0.01 && (
          <g opacity={docOpacity} transform={`translate(${docPos.x} ${docPos.y}) scale(${docScale})`}>
            <rect
              x={-32}
              y={-42}
              width={64}
              height={84}
              rx={8}
              fill="var(--card)"
              stroke={verified ? 'var(--state-settled)' : 'var(--foreground)'}
              strokeWidth={2}
            />
            {[0, 1, 2].map((l) => (
              <rect
                key={l}
                x={-20}
                y={-28 + l * 12}
                height={4}
                rx={2}
                width={40 * clamp((ps - 0.2 - l * 0.15) / 0.3) * (l === 2 ? 0.6 : 1)}
                fill="var(--muted-foreground)"
                opacity={0.5}
              />
            ))}
            <text y={28} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--foreground)">
              $100M
            </text>
            {verified && <Tick at={{ x: 30, y: -40 }} />}
          </g>
        )}

        {/* Verify tick in flight. */}
        {pv > 0 && !verified && <Tick at={tickPos} />}

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
              rx={3}
              fill={settledTone && fly >= 1 ? 'var(--state-settled)' : 'var(--primary)'}
              opacity={tileFade}
              style={{ transition: 'fill 400ms' }}
            />
          )
        })}

        {/* USDT from investors to builder. */}
        {Array.from({ length: 8 }, (_, c) => {
          const lc = ease(clamp((pf - 0.12 - c * 0.05) / 0.45))
          if (lc <= 0 || lc >= 1) return null
          const at = bezier(g.investors[c % 4], g.c.fund, g.builder, lc)
          return <Coin key={c} at={at} fill="var(--primary)" ink="var(--primary-foreground)" />
        })}

        {/* Client pays the business. */}
        {Array.from({ length: 6 }, (_, c) => {
          const lc = ease(clamp((pr - c * 0.07) / 0.55))
          if (lc <= 0 || lc >= 1) return null
          return <Coin key={c} at={bezier(g.client, g.c.repay, g.builder, lc)} fill="var(--state-settled)" ink="white" />
        })}
        <text
          x={g.c.repayLabel.x}
          y={g.c.repayLabel.y}
          textAnchor="middle"
          fontSize={15}
          fontWeight={700}
          fill="var(--state-settled)"
          opacity={pr > 0 && pr < 1 ? Math.sin(pr * Math.PI) : 0}
        >
          $100M
        </text>

        {/* Business pays every holder. */}
        {Array.from({ length: 8 }, (_, c) => {
          const lc = ease(clamp((pst - c * 0.05) / 0.45))
          if (lc <= 0 || lc >= 1) return null
          return <Coin key={c} at={bezier(g.builder, g.c.settle, g.investors[c % 4], lc)} fill="var(--state-settled)" ink="white" />
        })}

        {/* Day one to due date. */}
        <line x1={g.line.x0} y1={g.line.y} x2={g.line.x1} y2={g.line.y} stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />
        <line x1={g.line.x0} y1={g.line.y} x2={marker} y2={g.line.y} stroke="var(--foreground)" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        <circle cx={marker} cy={g.line.y} r={6} fill="var(--foreground)" />
        <text x={g.line.x0} y={g.line.y + 26} fontSize={13} fill="var(--muted-foreground)">
          Day 1
        </text>
        <text x={(g.line.x0 + g.line.x1) / 2} y={g.line.y + 26} fontSize={13} fill="var(--muted-foreground)" textAnchor="middle">
          12 months
        </text>
        <text x={g.line.x1} y={g.line.y + 26} fontSize={13} fill="var(--muted-foreground)" textAnchor="end">
          Due date
        </text>
      </svg>
    </div>
  )
}

export default FlowAnimation
