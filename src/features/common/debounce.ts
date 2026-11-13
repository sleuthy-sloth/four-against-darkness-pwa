/**
 * Debounce helper (polish pass, P0-1): coalesce a burst of calls — e.g.
 * window resize / orientationchange — into one call after the burst
 * quiets. `cancel()` drops a pending call (unmount / cleanup).
 */

export type DebouncedFn<Args extends unknown[] = []> = {
  (...args: Args): void
  cancel: () => void
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): DebouncedFn<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: Args): void => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, waitMs)
  }
  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}
