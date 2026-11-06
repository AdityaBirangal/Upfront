import { useState } from 'react'

export type SortValue = bigint | number | string | null | undefined
export type SortDir = 'asc' | 'desc'
export type SortState = { key: string; dir: SortDir }

function compare(a: NonNullable<SortValue>, b: NonNullable<SortValue>): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, undefined, { numeric: true })
  return a < b ? -1 : a > b ? 1 : 0
}

/** A sorted copy. Stable, so ties keep their order, and rows with no value stay last either way. */
export function sortRows<T>(rows: T[], value: (row: T) => SortValue, dir: SortDir): T[] {
  return [...rows].sort((x, y) => {
    const a = value(x)
    const b = value(y)
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1
    if (b === null || b === undefined) return -1
    return dir === 'asc' ? compare(a, b) : compare(b, a)
  })
}

/** Which column a table is sorted by. Clicking a new column uses its `first` direction. */
export function useSort(initial: SortState) {
  const [sort, setSort] = useState(initial)
  function toggle(key: string, first: SortDir = 'desc') {
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: first },
    )
  }
  return { sort, toggle }
}
