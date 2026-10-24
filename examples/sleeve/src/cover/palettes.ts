import type { PaletteId } from './types'

export interface Palette {
  id: PaletteId
  name: string
  bg: string
  primary: string
  secondary: string
}

export const PALETTES: readonly Palette[] = [
  { id: 'midnight', name: 'Midnight', bg: '#202B59', primary: '#DDEA72', secondary: '#F5F3EE' },
  { id: 'brick', name: 'Brick', bg: '#F5F3EE', primary: '#B63E32', secondary: '#1D1D1B' },
  { id: 'ember', name: 'Ember', bg: '#F26946', primary: '#372743', secondary: '#F5F3EE' },
  { id: 'sage', name: 'Sage', bg: '#EDDFC1', primary: '#1D1D1B', secondary: '#A8B49B' },
  { id: 'volt', name: 'Volt', bg: '#354DFF', primary: '#F5F3EE', secondary: '#1D1D1B' },
  { id: 'blush', name: 'Blush', bg: '#CEC9BD', primary: '#1D1D1B', secondary: '#E9BEC8' },
]

export const PALETTE_BY_ID = Object.fromEntries(PALETTES.map((p) => [p.id, p])) as Record<
  PaletteId,
  Palette
>

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PALETTE_BY_ID, value)
}

function channel(v: number) {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string) {
  const v = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((v >> 16) & 255) + 0.7152 * channel((v >> 8) & 255) + 0.0722 * channel(v & 255)
}

/** WCAG contrast ratio. */
export function contrast(a: string, b: string) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** First preferred color that reaches `min` contrast on `on`, else the best available. */
export function pickInk(on: string, prefer: readonly string[], min: number, pool: readonly string[]) {
  for (const c of prefer) if (contrast(c, on) >= min) return c
  let best = pool[0]
  for (const c of pool) if (contrast(c, on) > contrast(best, on)) best = c
  return best
}
