import { describe, expect, it } from 'vitest'

import { DEFAULT_PALETTE, isPaletteId, PALETTE_IDS, PALETTE_OPTIONS } from '@/lib/palettes'

describe('palette registry', () => {
  it('exposes exactly seven distinct settings choices', () => {
    expect(PALETTE_IDS).toHaveLength(7)
    expect(new Set(PALETTE_IDS).size).toBe(7)
    expect(PALETTE_OPTIONS.map((option) => option.id)).toEqual(PALETTE_IDS)
  })

  it('uses Voltage as the non-green/brown default and validates persisted values', () => {
    expect(DEFAULT_PALETTE).toBe('voltage')
    expect(isPaletteId('cobalt')).toBe(true)
    expect(isPaletteId('quiet-strength')).toBe(false)
  })
})
