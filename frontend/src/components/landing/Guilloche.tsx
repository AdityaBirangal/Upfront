/**
 * An engraved rosette, like the security print on a bond certificate. Two families of wavy rings,
 * phase-shifted so they weave. Path data is computed once at load.
 */
function rings(count: number, base: number, gap: number, amp: number, lobes: number, twist: number, steps: number) {
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    let d = ''
    for (let s = 0; s <= steps; s++) {
      const a = (s / steps) * Math.PI * 2
      const r = base + i * gap + amp * Math.sin(lobes * a + i * twist)
      d += `${s === 0 ? 'M' : 'L'}${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`
    }
    out.push(`${d}Z`)
  }
  return out
}

const OUTER = rings(9, 84, 7, 9, 24, 0.42, 360)
const INNER = rings(6, 34, 6, 6, 14, -0.5, 220)

function Guilloche({ className }: { className?: string }) {
  return (
    <svg viewBox="-160 -160 320 320" className={className} fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth={0.55}>
        {OUTER.map((d, i) => (
          <path key={`o${i}`} d={d} />
        ))}
        {INNER.map((d, i) => (
          <path key={`i${i}`} d={d} />
        ))}
        <circle r={150} strokeWidth={0.8} />
        <circle r={154} strokeWidth={0.4} />
      </g>
    </svg>
  )
}

export default Guilloche
