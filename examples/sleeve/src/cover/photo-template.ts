import { BOTTOM, META_TOP, RIGHT, SAFE } from './geometry'
import { DEFAULT_CROP, DEMO_PHOTO } from './photo'
import type { TemplateDef } from './templates'

/** The seventh cover: one image window and an independent editorial title area. */
export const WINDOW_TEMPLATE: TemplateDef = {
  id: 'window',
  no: '07',
  name: 'WINDOW',
  blurb: 'A quiet frame for your own point of view.',
  palette: 'sage',
  weight: 600,
  sample: { title: 'A QUIET\nPLACE', subtitle: 'Places, collected in passing.' },
  title: { size: 112, min: 56, max: 144, align: 'left' },
  compose(c) {
    const ink = c.ink(['primary', 'secondary'])
    c.meta('index', SAFE, META_TOP, 'start', ink)
    c.meta('vol', RIGHT, BOTTOM, 'end', ink)
    const window = { x: SAFE, y: 138, w: 650, h: 580 }
    c.rect(window.x, window.y, window.w, window.h, c.palette.secondary)
    c.image(c.input.photo ?? DEMO_PHOTO, c.input.crop ?? DEFAULT_CROP, window)
    c.rect(768, 138, 68, 68, c.palette.primary)
    c.label(c.input.photo ? 'YOUR VIEW' : 'AI-GENERATED DEMO', SAFE, 758, 'start', ink)
    const sub = c.subtitle({ x: SAFE, y: BOTTOM, anchor: 'bottom', width: 610, maxLines: 2, fill: ink })
    const fit = c.fitTitle({ maxWidth: RIGHT - SAFE, maxHeight: (sub ? sub.top : BOTTOM) - 26 - 796 })
    c.placeTitle(fit, { anchorY: 'top', y: 796, prefer: ['primary', 'secondary'] })
  },
}
