import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@/contexts/theme-context'

/**
 * F10 (audit HIGH-9) — the app must NOT blank while /api/theme is in flight.
 *
 * BDD:
 *   Scenario: The theme server is slow / unreachable
 *     Given /api/theme never resolves
 *     When the app renders
 *     Then the children still appear (theme applied later, never blocking)
 *
 * Was RED: ThemeProvider returned null until `mounted`, and `mounted` was only
 * set true AFTER awaiting fetch(/api/theme). A hung server = permanent white screen.
 */

describe('ThemeProvider non-blocking render (F10)', () => {
  beforeEach(() => {
    // A fetch that never resolves — simulates a hung/slow theme server.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})) as unknown as typeof fetch)
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('renders children even when /api/theme never resolves', async () => {
    render(
      <ThemeProvider>
        <div data-testid="app-child">visible</div>
      </ThemeProvider>,
    )

    // The child must appear without waiting on the network round-trip.
    await waitFor(() => expect(screen.getByTestId('app-child')).toBeInTheDocument())
    expect(screen.getByText('visible')).toBeInTheDocument()
  })
})
