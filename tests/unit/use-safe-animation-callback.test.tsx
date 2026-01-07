import { act, cleanup, render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DependencyList } from 'react'
import { useEffect } from 'react'

import { useDebouncedCallback, useSafeAnimationCallback } from '@/hooks/use-safe-animation-callback'

type SafeCallback = (...args: unknown[]) => void

interface TestHookProps {
  callback: SafeCallback
  dependencies?: DependencyList
  onReady: (fn: SafeCallback) => void
}

interface TestDebouncedProps extends TestHookProps {
  delay: number
}

const originalRequestAnimationFrame = globalThis.requestAnimationFrame
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame

let rafIdCounter = 0
let rafCallbacks = new Map<number, FrameRequestCallback>()

const installAnimationFrameStub = () => {
  rafIdCounter = 0
  rafCallbacks = new Map()

  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafIdCounter += 1
    rafCallbacks.set(rafIdCounter, cb)
    return rafIdCounter
  }) as typeof globalThis.requestAnimationFrame

  globalThis.cancelAnimationFrame = ((id: number) => {
    rafCallbacks.delete(id)
  }) as typeof globalThis.cancelAnimationFrame
}

const restoreAnimationFrameStub = () => {
  if (originalRequestAnimationFrame) {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame
  } else {
    Reflect.deleteProperty(globalThis, 'requestAnimationFrame')
  }

  if (originalCancelAnimationFrame) {
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame
  } else {
    Reflect.deleteProperty(globalThis, 'cancelAnimationFrame')
  }
}

const flushAllAnimationFrames = () => {
  const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
  while (rafCallbacks.size > 0) {
    const callbacks = Array.from(rafCallbacks.values())
    rafCallbacks.clear()
    callbacks.forEach(callback => callback(now))
  }
}

const SafeCallbackTestHarness = ({ callback, dependencies = [], onReady }: TestHookProps) => {
  const safeCallback = useSafeAnimationCallback(callback, dependencies)

  useEffect(() => {
    onReady(safeCallback)
  }, [safeCallback, onReady])

  return null
}

const DebouncedCallbackTestHarness = ({ callback, delay, dependencies = [], onReady }: TestDebouncedProps) => {
  const debouncedCallback = useDebouncedCallback(callback, delay, dependencies)

  useEffect(() => {
    onReady(debouncedCallback)
  }, [debouncedCallback, onReady])

  return null
}

describe('useSafeAnimationCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installAnimationFrameStub()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    restoreAnimationFrameStub()
  })

  it('returns a stable callback and processes queued calls in order', () => {
    const firstHandler = vi.fn()
    const updatedHandler = vi.fn()
    const capture = vi.fn<[SafeCallback], void>()

    const { rerender } = render(
      <SafeCallbackTestHarness
        callback={(value: unknown) => firstHandler(value)}
        dependencies={[]}
        onReady={capture}
      />
    )

    expect(capture).toHaveBeenCalledTimes(1)
    const safeCallback = capture.mock.calls[0][0]

    act(() => {
      safeCallback('initial')
      safeCallback('latest')
    })

    flushAllAnimationFrames()

    expect(firstHandler).toHaveBeenCalledTimes(2)
    expect(firstHandler.mock.calls.map(call => call[0])).toEqual(['initial', 'latest'])

    rerender(
      <SafeCallbackTestHarness
        callback={(value: unknown) => updatedHandler(value)}
        dependencies={[]}
        onReady={capture}
      />
    )

    // On re-render the hook should retain the same handler instance
    expect(capture).toHaveBeenCalledTimes(1)

    act(() => {
      safeCallback('post-update')
    })

    flushAllAnimationFrames()

    expect(updatedHandler).toHaveBeenCalledTimes(1)
    expect(updatedHandler).toHaveBeenCalledWith('post-update')
    expect(firstHandler).toHaveBeenCalledTimes(2)
  })

  it('clears pending work when the component unmounts', () => {
    const handler = vi.fn()
    const capture = vi.fn<[SafeCallback], void>()

    const { unmount } = render(
      <SafeCallbackTestHarness
        callback={(value: unknown) => handler(value)}
        dependencies={[]}
        onReady={capture}
      />
    )

    const safeCallback = capture.mock.calls[0][0]

    act(() => {
      safeCallback('queued')
    })

    unmount()

    flushAllAnimationFrames()

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installAnimationFrameStub()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    restoreAnimationFrameStub()
  })

  it('debounces rapid invocations and executes only the latest call', () => {
    const handler = vi.fn()
    const capture = vi.fn<[SafeCallback], void>()

    render(
      <DebouncedCallbackTestHarness
        callback={(value: unknown) => handler(value)}
        delay={200}
        dependencies={[]}
        onReady={capture}
      />
    )

    const debounced = capture.mock.calls[0][0]

    act(() => {
      debounced('first')
      debounced('second')
    })

    vi.advanceTimersByTime(199)
    flushAllAnimationFrames()
    expect(handler).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    flushAllAnimationFrames()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith('second')
  })

  it('cancels pending work when unmounted', () => {
    const handler = vi.fn()
    const capture = vi.fn<[SafeCallback], void>()

    const { unmount } = render(
      <DebouncedCallbackTestHarness
        callback={(value: unknown) => handler(value)}
        delay={150}
        dependencies={[]}
        onReady={capture}
      />
    )

    const debounced = capture.mock.calls[0][0]

    act(() => {
      debounced('will-cancel')
    })

    unmount()

    vi.runAllTimers()
    flushAllAnimationFrames()

    expect(handler).not.toHaveBeenCalled()
  })
})
