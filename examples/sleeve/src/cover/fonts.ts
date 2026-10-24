import { useSyncExternalStore } from 'react'
import type { FontId } from './types'

const CJK_FALLBACK =
  '"Noto Sans SC Variable", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'

export const CJK_FACE = '"Noto Sans SC Variable"'

export interface FontWeight {
  value: number
  label: string
}

export interface FontDef {
  id: FontId
  name: string
  /** The single loaded face, used for loading and checks. */
  face: string
  /** Full stack used for drawing, with the explicit Chinese fallback. */
  family: string
  /** Cap height as a share of the font size (measured). */
  cap: number
  /** Title line advance as a share of the font size. */
  lineHeight: number
  /** Only weights that actually ship are offered: nothing is synthesized. */
  weights: readonly FontWeight[]
}

export const FONTS: Record<FontId, FontDef> = {
  grotesk: {
    id: 'grotesk',
    name: 'Space Grotesk',
    face: '"Space Grotesk"',
    family: `"Space Grotesk", ${CJK_FALLBACK}`,
    cap: 0.7,
    lineHeight: 0.98,
    weights: [
      { value: 600, label: 'SemiBold' },
      { value: 700, label: 'Bold' },
    ],
  },
  mono: {
    id: 'mono',
    name: 'DM Mono',
    face: '"DM Mono"',
    family: `"DM Mono", ${CJK_FALLBACK}`,
    cap: 0.71,
    lineHeight: 1.06,
    weights: [
      { value: 400, label: 'Regular' },
      { value: 500, label: 'Medium' },
    ],
  },
}

export const FONT_IDS: readonly FontId[] = ['grotesk', 'mono']

/** Measured Noto Sans SC ink: ascent ≈ 0.86 em, descent ≈ 0.10 em. */
export const CJK_METRICS = { cap: 0.86, lineHeight: 1.14 }

export function isFontId(value: unknown): value is FontId {
  return value === 'grotesk' || value === 'mono'
}

/** Keeps a weight that exists in `font`, mapping the lighter/heavier choice across families. */
export function weightFor(font: FontId, weight: number): number {
  const weights = FONTS[font].weights
  if (weights.some((w) => w.value === weight)) return weight
  return weight >= 600 ? weights[weights.length - 1].value : weights[0].value
}

// ---------------------------------------------------------------------------
// Font readiness. Text is measured on a canvas, so every time a face or a
// unicode-range subset finishes loading, layouts must be recomputed.

let epoch = 0
let coreReady = false
const listeners = new Set<() => void>()
const invalidators = new Set<() => void>()

function bump() {
  epoch += 1
  invalidators.forEach((fn) => fn())
  listeners.forEach((fn) => fn())
}

/** Register a cache that must be dropped when fonts change. */
export function onFontsChanged(fn: () => void) {
  invalidators.add(fn)
}

const hasFontApi = typeof document !== 'undefined' && 'fonts' in document

const CORE_FACES = [
  '400 16px "Space Grotesk"',
  '500 16px "Space Grotesk"',
  '600 16px "Space Grotesk"',
  '700 16px "Space Grotesk"',
  '400 16px "DM Mono"',
  '500 16px "DM Mono"',
]

if (hasFontApi) {
  document.fonts.addEventListener('loadingdone', bump)
  const loads = Promise.all(CORE_FACES.map((f) => document.fonts.load(f, 'AaZz09/.')))
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 4000))
  Promise.race([loads, timeout])
    .catch(() => undefined)
    .then(() => {
      coreReady = true
      bump()
    })
} else {
  coreReady = true
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const getEpoch = () => epoch

/** Re-renders whenever new font data arrives. */
export function useFontEpoch() {
  return useSyncExternalStore(subscribe, getEpoch, getEpoch)
}

/** True once the Latin faces have loaded (or timed out), so first layouts are measured correctly. */
export function useCoreFontsReady() {
  useFontEpoch()
  return coreReady
}

export interface TextRun {
  face: string
  weight: number
  text: string
}

/** Characters the Latin faces do not cover; these come from the Chinese fallback. */
function fallbackChars(text: string) {
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    const latin =
      cp <= 0x24f ||
      (cp >= 0x300 && cp <= 0x36f) ||
      (cp >= 0x1e00 && cp <= 0x1eff) ||
      (cp >= 0x2000 && cp <= 0x206f)
    if (!latin) out += ch
  }
  return out
}

/** Loads exactly the faces and unicode-range subsets these runs need. */
export async function loadRuns(runs: readonly TextRun[]) {
  if (!hasFontApi) return
  const jobs: Promise<unknown>[] = []
  for (const run of runs) {
    jobs.push(document.fonts.load(`${run.weight} 64px ${run.face}`, run.text || 'A'))
    const extra = fallbackChars(run.text)
    if (extra) jobs.push(document.fonts.load(`${run.weight} 64px ${CJK_FACE}`, extra))
  }
  await Promise.all(jobs)
}

/** True when every face needed by the runs is loaded. */
export function runsReady(runs: readonly TextRun[]) {
  if (!hasFontApi) return true
  return runs.every((run) => {
    if (!document.fonts.check(`${run.weight} 64px ${run.face}`, run.text || 'A')) return false
    const extra = fallbackChars(run.text)
    return !extra || document.fonts.check(`${run.weight} 64px ${CJK_FACE}`, extra)
  })
}
