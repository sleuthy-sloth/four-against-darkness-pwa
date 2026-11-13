import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from '../../src/features/common/debounce'

describe('debounce (polish pass — resize re-fit)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls once after the burst quiets', () => {
    const fn = vi.fn()
    const d = debounce(fn, 200)
    d()
    d()
    d()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(199)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('restarts the wait on every call', () => {
    const fn = vi.fn()
    const d = debounce(fn, 200)
    d()
    vi.advanceTimersByTime(150)
    d()
    vi.advanceTimersByTime(150)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes the latest arguments through', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d('a' as never)
    d('b' as never)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('cancel drops a pending call', () => {
    const fn = vi.fn()
    const d = debounce(fn, 200)
    d()
    d.cancel()
    vi.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()
  })
})
