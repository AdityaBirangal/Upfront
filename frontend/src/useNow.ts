import { useEffect, useState } from 'react'

const seconds = () => BigInt(Math.floor(Date.now() / 1000))

/** Unix seconds, updated every second, so countdowns tick and due-date buttons appear on time. */
export function useNow(): bigint {
  const [now, setNow] = useState(seconds)
  useEffect(() => {
    const timer = setInterval(() => setNow(seconds()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}
