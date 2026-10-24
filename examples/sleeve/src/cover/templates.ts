import { BOTTOM as B, META_TOP, RIGHT as R, SAFE as M, SIZE as S, clamp } from './geometry'
import { WINDOW_TEMPLATE } from './photo-template'
import type { Composer } from './scene'
import type { Align, PaletteId, TemplateId } from './types'

export interface TemplateDef {
  id: TemplateId
  no: string
  name: string
  blurb: string
  palette: PaletteId
  /** Default Space Grotesk weight for the title. */
  weight: number
  sample: { title: string; subtitle: string }
  title: { size: number; min: number; max: number; align: Align }
  compose(c: Composer): void
}

const ORBIT_RINGS: readonly (readonly [number, number])[] = [
  [110, 140],
  [202, 266],
  [342, 366],
  [452, 560],
]

/** PULSE bar heights as shares of the tallest bar. */
const PULSE_BARS = [0.26, 0.44, 0.62, 0.38, 0.8, 0.54, 1, 0.68, 0.46, 0.76, 0.34, 0.58]
const PULSE_PEAK = 6

export const TEMPLATES: readonly TemplateDef[] = [
  {
    id: 'orbit',
    no: '01',
    name: 'ORBIT',
    blurb: 'Late-night loops, held in orbit.',
    palette: 'midnight',
    weight: 600,
    sample: { title: 'AFTER\nHOURS', subtitle: 'A selection for the late shift.' },
    title: { size: 204, min: 72, max: 232, align: 'left' },
    compose(c) {
      const ink = c.ink(['secondary', 'primary'])
      c.meta('index', M, META_TOP, 'start', ink)
      c.meta('vol', R, B, 'end', ink)
      // The outer groove meets the last letters of the upper line. The second
      // line remains grounded in the quiet lower field, rather than fighting
      // four equally weighted circles. Crossing type reverses like a print plate.
      for (const [inner, outer] of ORBIT_RINGS) c.ring(900, 270, inner, outer, c.palette.primary)
      c.circle(900, 270, 7, c.palette.primary)
      c.rect(M, 118, 258, 2, ink)
      c.label('SIDE A / 33 RPM', M, 164, 'start', ink)
      const sub = c.subtitle({ x: M, y: B, anchor: 'bottom', width: 600, maxLines: 3, fill: ink })
      const base = sub ? sub.top - 44 : B
      const fit = c.fitTitle({ maxWidth: 850, maxHeight: base - 176 })
      c.placeTitle(fit, { anchorY: 'bottom', y: base, prefer: ['secondary', 'primary'] })
    },
  },
  {
    id: 'typecut',
    no: '02',
    name: 'TYPE CUT',
    blurb: 'Big type. An independent spirit.',
    palette: 'brick',
    weight: 700,
    sample: { title: 'SUNDAY\nLOOP', subtitle: 'Easy tracks, on repeat.' },
    title: { size: 248, min: 96, max: 288, align: 'left' },
    compose(c) {
      const ink = c.ink(['secondary', 'primary'])
      c.meta('index', M, META_TOP, 'start', ink)
      c.meta('vol', R, B, 'end', ink)
      const rules = c.ink(['secondary', 'primary'], c.palette.bg, 3)
      c.rect(M, 118, S - 2 * M, 2, rules)
      c.label('CUT / 02', R, 164, 'end', ink)
      const rule = 812
      c.rect(M, rule, S - 2 * M, 2, rules)
      c.subtitle({ x: M, y: rule + 54, anchor: 'top', width: 700, maxLines: 3, fill: ink })
      // A small horizontal cut goes through the actual letterforms on every
      // line; the lower half is misregistered. It also follows moved titles.
      const base = rule - 48
      const fit = c.fitTitle({ maxWidth: S - 2 * M - 24, maxHeight: base - 212 })
      c.placeTitle(fit, {
        anchorY: 'bottom',
        y: base,
        prefer: ['primary', 'secondary'],
        cut: { shift: Math.min(22, fit.size * 0.075), gap: Math.max(2, fit.size * 0.019) },
      })
    },
  },
  {
    id: 'pulse',
    no: '03',
    name: 'PULSE',
    blurb: 'A brighter kind of high energy.',
    palette: 'ember',
    weight: 700,
    sample: { title: 'OPEN CIRCUIT', subtitle: 'Selections for moving forward.' },
    title: { size: 136, min: 64, max: 180, align: 'left' },
    compose(c) {
      const ink = c.ink(['primary', 'secondary'])
      c.meta('index', M, META_TOP, 'start', ink)
      c.meta('vol', R, B, 'end', ink)
      const base = 905
      const tallest = 471
      const width = 46.8
      const pitch = (S - 2 * M - width) / (PULSE_BARS.length - 1)
      PULSE_BARS.forEach((share, i) => {
        const h = share * tallest
        c.rect(M + i * pitch, base - h, width, h, i === PULSE_PEAK ? c.palette.secondary : c.palette.primary)
      })
      c.subtitle({ x: M, y: base + 58, anchor: 'top', width: 640, maxLines: 2, fill: ink })
      const top = 158
      const fit = c.fitTitle({ maxWidth: 800, maxHeight: base - tallest - 36 - top })
      c.placeTitle(fit, { anchorY: 'top', y: top, prefer: ['primary', 'secondary'] })
    },
  },
  {
    id: 'patchwork',
    no: '04',
    name: 'PATCHWORK',
    blurb: 'Warm shapes, good company.',
    palette: 'sage',
    weight: 700,
    sample: { title: 'GOOD COMPANY', subtitle: 'A small gathering of good sounds.' },
    title: { size: 100, min: 56, max: 140, align: 'center' },
    compose(c) {
      const ink = c.ink(['primary', 'secondary'])
      c.meta('index', M, META_TOP, 'start', ink)
      c.meta('vol', R, META_TOP, 'end', ink)
      const align = c.input.align
      const sub = c.subtitle({
        x: align === 'left' ? M : align === 'center' ? S / 2 : R,
        y: B,
        anchor: 'bottom',
        width: 760,
        maxLines: 2,
        fill: ink,
        align: align === 'left' ? 'start' : align === 'center' ? 'middle' : 'end',
      })
      const base = (sub ? sub.top : B) - 36
      const gridTop = 124
      const minGrid = 468
      const gap = 48
      const fit = c.fitTitle({ maxWidth: S - 2 * M, maxHeight: base - gridTop - minGrid - gap })
      const avail = base - fit.height - gap - gridTop
      const size = Math.round(clamp(avail, minGrid, 744) / 6) * 6
      const m = size / 3
      const x0 = Math.round((S - size) / 2)
      const y0 = Math.round(gridTop + Math.max(0, (avail - size) / 2))
      const P = c.palette.primary
      const Q = c.palette.secondary
      const at = (col: number, row: number) => [x0 + col * m, y0 + row * m] as const
      let [x, y] = at(0, 0)
      c.rect(x, y, m, m, Q)
      c.quarter(x + m, y + m, m, 'up-left', P)
      ;[x, y] = at(1, 0)
      c.circle(x + m / 2, y + m / 2, m / 2, P)
      ;[x, y] = at(2, 0)
      c.rect(x, y, m, m, Q)
      c.rect(x + m / 2, y, m / 2, m, P)
      ;[x, y] = at(0, 1)
      c.circle(x + m / 2, y + m / 2, m / 2, P)
      ;[x, y] = at(1, 1)
      c.rect(x, y, m / 2, m, P)
      c.half(x + m / 2, y + m / 2, m / 2, 'right', Q)
      ;[x, y] = at(2, 1)
      c.quarter(x + m, y, m, 'down-left', P)
      ;[x, y] = at(0, 2)
      c.rect(x, y + m / 2, m, m / 2, Q)
      c.half(x + m / 2, y + m / 2, m / 2, 'up', P)
      ;[x, y] = at(1, 2)
      c.quarter(x, y, m, 'down-right', P)
      ;[x, y] = at(2, 2)
      c.rect(x, y, m, m, Q)
      c.circle(x + m / 2, y + m / 2, m / 2, P)
      c.placeTitle(fit, { anchorY: 'bottom', y: base, prefer: ['primary', 'secondary'] })
    },
  },
  {
    id: 'diagonal',
    no: '05',
    name: 'DIAGONAL',
    blurb: 'Forward motion, full volume.',
    palette: 'volt',
    weight: 600,
    sample: { title: 'FAST FORWARD', subtitle: 'Keep the city in motion.' },
    title: { size: 144, min: 64, max: 180, align: 'left' },
    compose(c) {
      const ink = c.ink(['primary', 'secondary'])
      c.meta('index', M, META_TOP, 'start', ink)
      c.meta('vol', R, B, 'end', ink)
      const top = 470
      const bottom = 930
      const run = (bottom - top) * 1.32
      const pitch = 310
      const band = 178
      for (let k = 0; k < 4; k++) {
        const a = 491 + k * pitch
        c.poly(
          [
            [a, top],
            [a + band, top],
            [a + band - run, bottom],
            [a - run, bottom],
          ],
          k === 2 ? c.palette.secondary : c.palette.primary,
        )
      }
      c.subtitle({ x: M, y: B, anchor: 'bottom', width: 600, maxLines: 2, fill: ink })
      const titleTop = 158
      const fit = c.fitTitle({ maxWidth: 840, maxHeight: top - 40 - titleTop })
      c.placeTitle(fit, { anchorY: 'top', y: titleTop, prefer: ['primary', 'secondary'] })
    },
  },
  {
    id: 'index',
    no: '06',
    name: 'INDEX',
    blurb: 'Personal sounds, carefully filed.',
    palette: 'blush',
    weight: 700,
    sample: { title: 'SOFT\nFOCUS', subtitle: 'Collected for a slower afternoon.' },
    title: { size: 226, min: 72, max: 252, align: 'left' },
    compose(c) {
      const ink = c.ink(['primary', 'secondary'])
      c.meta('index', M, META_TOP, 'start', ink)
      c.meta('vol', R, B, 'end', ink)
      const rules = c.ink(['primary', 'secondary'], c.palette.bg, 3)
      c.rect(M, 118, S - 2 * M, 2, rules)
      // A compact file tab carries the series number. The listener's title,
      // rather than a huge decorative "06", becomes the identity of this sleeve.
      c.rect(M, 180, 244, 176, c.palette.secondary)
      c.deco(c.template.no, {
        x: M + 20,
        y: 326,
        size: 172,
        anchor: 'start',
        fill: ink,
      })
      c.label('PERSONAL PRESSING', R, 202, 'end', ink)
      c.label('STEREO / SIDE A', R, 348, 'end', ink)
      c.rect(M, 400, S - 2 * M, 2, rules)
      c.label('COLLECTED SOUNDS', M, 446, 'start', ink)
      c.rect(M, 954, S - 2 * M, 2, rules)
      const sub = c.subtitle({ x: M, y: B, anchor: 'bottom', width: 680, maxLines: 2, fill: ink })
      const base = Math.min(916, (sub ? sub.top : B) - 52)
      const fit = c.fitTitle({ maxWidth: S - 2 * M, maxHeight: base - 470 })
      c.placeTitle(fit, { anchorY: 'bottom', y: base, prefer: ['primary', 'secondary'] })
    },
  },
  WINDOW_TEMPLATE,
]

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<TemplateId, TemplateDef>

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TEMPLATE_BY_ID, value)
}
