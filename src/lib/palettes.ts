export const PALETTE_IDS = [
  'voltage',
  'cobalt',
  'midnight-cyan',
  'carbon-magenta',
  'slate-crimson',
  'obsidian-lime',
  'monochrome-gold',
] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

export interface PaletteOption {
  id: PaletteId
  name: string
  description: string
  swatches: readonly [string, string, string, string]
  recommended?: boolean
}

export const DEFAULT_PALETTE: PaletteId = 'voltage'

export const PALETTE_OPTIONS: readonly PaletteOption[] = [
  {
    id: 'voltage',
    name: 'Voltage',
    description: 'Graphite, porcelain, and electric orange.',
    swatches: ['oklch(0.18 0.025 260)', 'oklch(0.985 0.004 260)', 'oklch(0.62 0.22 45)', 'oklch(0.56 0.16 255)'],
    recommended: true,
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    description: 'Bright porcelain with a decisive blue signal.',
    swatches: ['oklch(0.18 0.035 260)', 'oklch(0.99 0.004 255)', 'oklch(0.48 0.22 260)', 'oklch(0.63 0.18 225)'],
  },
  {
    id: 'midnight-cyan',
    name: 'Midnight Cyan',
    description: 'Deep navy with crisp performance cyan.',
    swatches: ['oklch(0.16 0.045 255)', 'oklch(0.98 0.008 230)', 'oklch(0.43 0.14 225)', 'oklch(0.66 0.16 205)'],
  },
  {
    id: 'carbon-magenta',
    name: 'Carbon Magenta',
    description: 'Carbon neutrals with a confident magenta edge.',
    swatches: ['oklch(0.17 0.02 330)', 'oklch(0.985 0.006 330)', 'oklch(0.48 0.21 340)', 'oklch(0.64 0.18 305)'],
  },
  {
    id: 'slate-crimson',
    name: 'Slate Crimson',
    description: 'Cool slate anchored by athletic crimson.',
    swatches: ['oklch(0.18 0.03 255)', 'oklch(0.985 0.005 255)', 'oklch(0.48 0.19 22)', 'oklch(0.62 0.15 45)'],
  },
  {
    id: 'obsidian-lime',
    name: 'Obsidian Lime',
    description: 'Near-black structure with controlled acid lime.',
    swatches: ['oklch(0.14 0.018 255)', 'oklch(0.985 0.006 110)', 'oklch(0.35 0.10 128)', 'oklch(0.82 0.20 125)'],
  },
  {
    id: 'monochrome-gold',
    name: 'Monochrome Gold',
    description: 'Editorial black and white with restrained gold.',
    swatches: ['oklch(0.15 0.008 80)', 'oklch(0.99 0.003 80)', 'oklch(0.45 0.10 75)', 'oklch(0.74 0.15 82)'],
  },
] as const

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as readonly string[]).includes(value)
}
