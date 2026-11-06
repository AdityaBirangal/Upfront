import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const POSTER = '/hero/site-poster.jpg'
const POSTER_SMALL = '/hero/site-poster-800.jpg'
const VIDEO_WEBM = '/hero/site.webm'
const VIDEO_MP4 = '/hero/site.mp4'

/** Video only on wide screens, with motion allowed and no data saver. Phones get the still. */
function videoAllowed() {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
  return (
    window.matchMedia('(min-width: 768px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !nav.connection?.saveData
  )
}

/**
 * The hero's backdrop: a data centre site at blue hour, the kind of project Upfront funds.
 * A still paints first; on wide screens a muted loop fades in over it and pauses off screen.
 * The hero is always dark, so the footage shows at near full strength. On wide screens it is
 * enlarged from the right edge, so the crane and the sparks land between the headline and the
 * card instead of behind the card. Scrims darken the left, where the headline sits.
 */
function HeroBackdrop({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const [allowed] = useState(videoAllowed)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = video.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {})
      else el.pause()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [allowed])

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 opacity-90 lg:origin-right lg:scale-[1.3]">
        <img
          src={POSTER}
          srcSet={`${POSTER_SMALL} 800w, ${POSTER} 1600w`}
          sizes="100vw"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-[70%_center]"
        />
        {allowed && (
          <video
            ref={video}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            onPlaying={() => setReady(true)}
            className={cn(
              'absolute inset-0 size-full object-cover object-[70%_center] transition-opacity duration-1000',
              ready ? 'opacity-100' : 'opacity-0',
            )}
          >
            <source src={VIDEO_WEBM} type="video/webm" />
            <source src={VIDEO_MP4} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Scrims. Phones stack text over the whole frame, so they get an even wash as well. */}
      <div className="bg-background/55 absolute inset-0 lg:hidden" />
      <div className="from-background/95 via-background/65 absolute inset-0 bg-gradient-to-r from-5% via-36% to-transparent to-68%" />
      <div className="from-background absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t to-transparent" />
      <div className="from-background/60 absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent" />
    </div>
  )
}

export default HeroBackdrop
