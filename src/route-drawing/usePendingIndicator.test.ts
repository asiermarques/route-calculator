import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePendingIndicator } from './usePendingIndicator'

describe('usePendingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('says nothing about work that finishes before a visitor could read it', () => {
    const { result, rerender } = renderHook(({ pending }) => usePendingIndicator(pending), {
      initialProps: { pending: true },
    })

    // A provider that answers in one frame is the case this exists for: the
    // status is a row of the footer bar, so showing it here would grow the bar
    // and shrink it again between two paints.
    act(() => {
      vi.advanceTimersByTime(80)
    })
    rerender({ pending: false })

    expect(result.current).toBe(false)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(false)
  })

  it('shows work that is still going after the threshold', () => {
    const { result } = renderHook(({ pending }) => usePendingIndicator(pending), {
      initialProps: { pending: true },
    })

    expect(result.current).toBe(false)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe(true)
  })

  it('holds a message that was shown long enough to be read', () => {
    const { result, rerender } = renderHook(({ pending }) => usePendingIndicator(pending), {
      initialProps: { pending: true },
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe(true)

    // Answered immediately after the threshold: the message has been on screen
    // for one frame, and leaving now is the flicker this is meant to prevent.
    rerender({ pending: false })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe(false)
  })

  it('leaves at once when the work already ran long', () => {
    const { result, rerender } = renderHook(({ pending }) => usePendingIndicator(pending), {
      initialProps: { pending: true },
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toBe(true)

    // Read for well over the hold already, so there is nothing to wait out.
    rerender({ pending: false })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(false)
  })

  it('stays on screen when the next segment starts during the hold', () => {
    const { result, rerender } = renderHook(({ pending }) => usePendingIndicator(pending), {
      initialProps: { pending: true },
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Drawing quickly is a run of short requests, not one long one. Letting the
    // status blink out between them would be the same flicker at a slower rate.
    rerender({ pending: false })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ pending: true })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe(true)
  })
})
