import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/lib/theme.ts'
import { cn } from '@/lib/utils'

/** The same site and framing at two times of day: day for the light theme, blue hour for dark. */
const FOOTAGE = {
  day: {
    poster: '/hero/site-day-poster.jpg',
    posterSmall: '/hero/site-day-poster-800.jpg',
    webm: '/hero/site-day.webm',
    mp4: '/hero/site-day.mp4',
    opacity: 'opacity-100',
  },
  night: {
    poster: '/hero/site-poster.jpg',
    posterSmall: '/hero/site-poster-800.jpg',
    webm: '/hero/site.webm',
    mp4: '/hero/site.mp4',
    opacity: 'opacity-90',
  },
}
type Footage = (typeof FOOTAGE)[keyof typeof FOOTAGE]

/** Slightly slower than real time, so the loop reads calmer behind the headline. */
const PLAYBACK_RATE = 0.8

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

/** One set of footage: the still paints first, the loop fades in over it and pauses off screen. */
function Clip({ f, allowed }: { f: Footage; allowed: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
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
  }, [])

  return (
    // Shown the way it was filmed, not mirrored.
    <div className={cn('absolute inset-0', f.opacity)}>
      <img
        src={f.poster}
        srcSet={`${f.posterSmall} 800w, ${f.poster} 1600w`}
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
          onLoadedMetadata={(e) => {
            e.currentTarget.defaultPlaybackRate = PLAYBACK_RATE
            e.currentTarget.playbackRate = PLAYBACK_RATE
          }}
          onPlaying={() => setReady(true)}
          className={cn(
            'absolute inset-0 size-full object-cover object-[70%_center] transition-opacity duration-1000',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        >
          <source src={f.webm} type="video/webm" />
          <source src={f.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  )
}

/**
 * The hero's backdrop: a data centre site under construction, the kind of project Upfront funds.
 * It follows the page theme: daytime footage in light mode, blue hour in dark mode. Only the
 * current theme's footage loads. Scrims in the page's own background colour calm the left, where
 * the headline sits, so the same layout reads in both.
 */
function HeroBackdrop({ className }: { className?: string }) {
  const { resolved } = useTheme()
  const [allowed] = useState(videoAllowed)
  const variant = resolved === 'light' ? 'day' : 'night'

  // Warm the other theme's still once the page is idle, so a theme switch fades into a picture, not a blank.
  useEffect(() => {
    const other = FOOTAGE[variant === 'day' ? 'night' : 'day']
    const id = window.setTimeout(() => {
      const img = new Image()
      img.src = window.innerWidth < 800 ? other.posterSmall : other.poster
    }, 1500)
    return () => window.clearTimeout(id)
  }, [variant])

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <Clip key={variant} f={FOOTAGE[variant]} allowed={allowed} />

      {/* Scrims. Phones stack text over the whole frame, so they get an even wash as well. */}
      <div className="bg-background/45 absolute inset-0 lg:hidden" />
      <div className="from-background/90 via-background/55 absolute inset-0 bg-gradient-to-r from-0% via-36% to-transparent to-65%" />
      {/* Daylight footage is bright and busy behind the paragraph, so light mode gets a light second wash. */}
      <div className="from-background/50 via-background/35 absolute inset-0 bg-gradient-to-r from-0% via-45% to-transparent to-65% dark:hidden" />
      <div className="from-background absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t to-transparent" />
      <div className="from-background/50 absolute inset-x-0 top-0 h-14 bg-gradient-to-b to-transparent" />
    </div>
  )
}

export default HeroBackdrop
