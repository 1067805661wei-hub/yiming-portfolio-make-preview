import { FONTS } from './fonts'
import {
  BOTTOM,
  META_SIZE,
  RIGHT,
  SAFE,
  SIZE,
  circlePath,
  clamp,
  halfBox,
  halfPath,
  intersects,
  polyBox,
  polyPath,
  quarterBox,
  quarterPath,
  rectPath,
  type Half,
  type Quarter,
} from './geometry'
import { PALETTE_BY_ID, contrast, pickInk, type Palette } from './palettes'
import { TEMPLATE_BY_ID, type TemplateDef } from './templates'
import { SUBTITLE_WEIGHT, fitSubtitle, fitTitle, type TitleFit } from './text'
import type {
  Box,
  CoverInput,
  CoverResult,
  FillRule,
  ImageNode,
  Knockout,
  KnockoutMask,
  PhotoAsset,
  PhotoCrop,
  ShapeNode,
  TextNode,
  TitleLayout,
} from './types'

export type Role = 'bg' | 'primary' | 'secondary'

interface MaskEntry {
  mask: KnockoutMask
  fill: string
  box: Box
}

const META_WEIGHT = 500

/**
 * Collects one cover's shapes and text in paint order. Templates describe their
 * composition through this API; preview, thumbnails and export all read the result.
 */
export class Composer {
  readonly palette: Palette
  readonly template: TemplateDef
  private readonly shapes: ShapeNode[] = []
  private readonly images: ImageNode[] = []
  private readonly texts: TextNode[] = []
  private readonly masks: MaskEntry[] = []
  private readonly textMasks: MaskEntry[] = []
  private titleNode: TextNode | null = null
  private titleLayout: TitleLayout | null = null
  private titleInk: Box[] = []

  constructor(readonly input: CoverInput) {
    this.palette = PALETTE_BY_ID[input.paletteId]
    this.template = TEMPLATE_BY_ID[input.templateId]
  }

  private get pool() {
    return [this.palette.bg, this.palette.primary, this.palette.secondary]
  }

  /** Text color: first preferred role readable on `on`, else the most contrasting palette color. */
  ink(prefer: readonly Role[], on: string = this.palette.bg, min = 4.5) {
    return pickInk(on, prefer.map((r) => this.palette[r]), min, this.pool)
  }

  path(d: string, fill: string, box: Box, rule: FillRule = 'nonzero') {
    this.shapes.push({ d, fill, rule, box })
    this.masks.push({ mask: { kind: 'path', d, rule }, fill, box })
  }

  rect(x: number, y: number, w: number, h: number, fill: string) {
    this.path(rectPath(x, y, w, h), fill, { x, y, w, h })
  }

  image(asset: PhotoAsset, crop: PhotoCrop, box: Box) {
    this.images.push({ asset, crop, box })
  }

  circle(cx: number, cy: number, r: number, fill: string) {
    this.path(circlePath(cx, cy, r), fill, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r })
  }

  ring(cx: number, cy: number, inner: number, outer: number, fill: string) {
    const box = { x: cx - outer, y: cy - outer, w: 2 * outer, h: 2 * outer }
    this.path(circlePath(cx, cy, outer) + circlePath(cx, cy, inner), fill, box, 'evenodd')
  }

  quarter(cx: number, cy: number, r: number, dir: Quarter, fill: string) {
    this.path(quarterPath(cx, cy, r, dir), fill, quarterBox(cx, cy, r, dir))
  }

  half(cx: number, cy: number, r: number, dir: Half, fill: string) {
    this.path(halfPath(cx, cy, r, dir), fill, halfBox(cx, cy, r, dir))
  }

  poly(points: readonly (readonly [number, number])[], fill: string) {
    this.path(polyPath(points), fill, polyBox(points))
  }

  label(text: string, x: number, y: number, anchor: TextNode['anchor'], fill: string) {
    this.texts.push({
      id: `label-${this.texts.length}`,
      family: FONTS.mono.family,
      weight: META_WEIGHT,
      size: META_SIZE,
      fill,
      anchor,
      lines: [{ text, x, y }],
    })
  }

  /** Shared metadata: "01 / ORBIT" or "SLEEVE / VOL. 01". */
  meta(kind: 'index' | 'vol', x: number, y: number, anchor: TextNode['anchor'], fill: string) {
    const { no, name } = this.template
    this.label(kind === 'index' ? `${no} / ${name}` : `SLEEVE / VOL. ${no}`, x, y, anchor, fill)
  }

  /** Decorative display text; the title is knocked out where it crosses it. */
  deco(
    text: string,
    o: { x: number; y: number; size: number; anchor: TextNode['anchor']; fill: string },
  ) {
    const font = FONTS.grotesk
    const node: TextNode = {
      id: `deco-${this.texts.length}`,
      family: font.family,
      weight: 700,
      size: o.size,
      fill: o.fill,
      anchor: o.anchor,
      lines: [{ text, x: o.x, y: o.y }],
    }
    this.texts.push(node)
    const w = text.length * 0.64 * o.size
    const left = o.anchor === 'start' ? o.x : o.anchor === 'middle' ? o.x - w / 2 : o.x - w
    this.textMasks.push({
      mask: { kind: 'text', node },
      fill: o.fill,
      box: { x: left, y: o.y - font.cap * o.size, w, h: font.cap * o.size },
    })
  }

  /** Places the subtitle; `y` is the first baseline (anchor top) or last baseline (anchor bottom). */
  subtitle(o: {
    x: number
    y: number
    anchor: 'top' | 'bottom'
    width: number
    maxLines: number
    fill: string
    align?: TextNode['anchor']
  }) {
    const fit = fitSubtitle(this.input.subtitle, o.width, o.maxLines)
    if (!fit) return null
    const step = fit.lh * fit.size
    const first = o.anchor === 'top' ? o.y : o.y - (fit.lines.length - 1) * step
    this.texts.push({
      id: 'subtitle',
      family: FONTS.mono.family,
      weight: SUBTITLE_WEIGHT,
      size: fit.size,
      fill: o.fill,
      anchor: o.align ?? 'start',
      lines: fit.lines.map((text, i) => ({ text, x: o.x, y: first + i * step })),
    })
    return { top: first - fit.asc * fit.size, bottom: first + (fit.lines.length - 1) * step }
  }

  fitTitle(o: { maxWidth: number; maxHeight: number }): TitleFit {
    const { input, template } = this
    return fitTitle(input.title, {
      font: FONTS[input.font],
      weight: input.weight,
      requested: input.size,
      min: template.title.min,
      maxWidth: o.maxWidth,
      maxHeight: o.maxHeight,
    })
  }

  /** `y` is the default top (anchor top) or bottom baseline (anchor bottom) of the title block. */
  placeTitle(fit: TitleFit, o: {
    anchorY: 'top' | 'bottom'
    y: number
    prefer: readonly Role[]
    cut?: { shift: number; gap: number }
  }) {
    const { input } = this
    const align = input.align
    const shift = o.cut?.shift ?? 0
    const w = fit.width + shift
    const h = fit.height
    const ax = input.x ?? (align === 'left' ? SAFE : align === 'center' ? SIZE / 2 : RIGHT)
    const ay = input.y ?? o.y
    const left = clamp(align === 'left' ? ax : align === 'center' ? ax - w / 2 : ax - w, SAFE, Math.max(SAFE, RIGHT - w))
    const top = clamp(o.anchorY === 'top' ? ay : ay - h, SAFE, Math.max(SAFE, BOTTOM - h))
    const anchor = align === 'left' ? 'start' : align === 'center' ? 'middle' : 'end'
    const lineX = align === 'left' ? left : align === 'center' ? left + fit.width / 2 : left + fit.width
    const step = fit.lh * fit.size

    if (fit.status !== 'empty') {
      this.titleNode = {
        id: 'title',
        family: FONTS[input.font].family,
        weight: input.weight,
        size: fit.size,
        fill: this.ink(o.prefer, this.palette.bg, 3),
        anchor,
        lines: fit.lines.map((text, i) => ({ text, x: lineX, y: top + fit.asc * fit.size + i * step })),
      }
      if (o.cut) {
        const gap = o.cut.gap
        // Cut each actual text line through the letter bodies. The lower half
        // slips along the paper, so custom Latin/CJK text gets the same effect.
        // Store geometry in the scene so SVG and the downloaded PNG agree.
        this.titleNode.fragments = this.titleNode.lines.flatMap((line, i) => {
          const cut = line.y - fit.asc * fit.size * 0.49
          const upper = line.y - fit.size * 1.25
          const lower = line.y + fit.size * 0.4
          return [
            { line: i, dx: 0, clip: { x: 0, y: upper, w: SIZE, h: cut - gap / 2 - upper } },
            { line: i, dx: shift, clip: { x: 0, y: cut + gap / 2, w: SIZE, h: lower - cut - gap / 2 } },
          ]
        })
      }
      this.titleInk = fit.lines.map((_, i) => {
        const lw = fit.widths[i]
        const baseline = top + fit.asc * fit.size + i * step
        const lx = anchor === 'start' ? lineX : anchor === 'middle' ? lineX - lw / 2 : lineX - lw
        return { x: lx, y: baseline - (fit.asc + 0.06) * fit.size, w: lw + shift, h: (fit.asc + 0.3) * fit.size }
      })
    }

    this.titleLayout = {
      status: fit.status,
      message: this.describe(fit),
      requested: fit.requested,
      size: fit.size,
      fitted: fit.status === 'ok' && fit.size < fit.requested,
      lines: fit.lines,
      box: { x: left, y: top, w, h },
      anchorY: o.anchorY,
      align,
    }
  }

  private describe(fit: TitleFit) {
    if (fit.status === 'empty') return 'Add a title to preview and download.'
    if (fit.status === 'ok') return null
    const min = `${fit.size} px`
    if (fit.reason === 'word' && fit.word) {
      const word = fit.word.length > 18 ? `${fit.word.slice(0, 17)}…` : fit.word
      return `“${word}” is too wide for one line, even at ${min}. Add a space or a line break.`
    }
    if (fit.reason === 'lines') {
      return `At ${min} this title still needs ${fit.lines.length} lines. Shorten it to fit in 3.`
    }
    return `This title is too tall for ${this.template.name}, even at ${min}. Shorten it or remove a line break.`
  }

  /** Background used where the title crosses a shape it would not be readable on. */
  private over(fill: string) {
    if (contrast(this.palette.bg, fill) >= 3) return this.palette.bg
    let best = this.pool[0]
    for (const c of this.pool) if (contrast(c, fill) > contrast(best, fill)) best = c
    return best
  }

  finish(): CoverResult {
    const knockouts: Knockout[] = []
    const title = this.titleNode
    if (title) {
      // Walk overlapping shapes in paint order so later shapes win, exactly like the art.
      let started = false
      for (const m of [...this.masks, ...this.textMasks]) {
        if (!this.titleInk.some((b) => intersects(b, m.box))) continue
        const fill = contrast(title.fill, m.fill) >= 3 ? title.fill : this.over(m.fill)
        if (!started && fill === title.fill) continue
        started = true
        knockouts.push({ mask: m.mask, fill })
      }
    }
    const layout = this.titleLayout ?? {
      status: 'empty' as const,
      message: 'Add a title to preview and download.',
      requested: this.input.size,
      size: this.input.size,
      fitted: false,
      lines: [],
      box: { x: SAFE, y: SAFE, w: 0, h: 0 },
      anchorY: 'top' as const,
      align: this.input.align,
    }
    return {
      scene: { background: this.palette.bg, shapes: this.shapes, images: this.images, texts: this.texts, title, knockouts },
      title: layout,
    }
  }
}

export function buildCover(input: CoverInput): CoverResult {
  const composer = new Composer(input)
  composer.template.compose(composer)
  return composer.finish()
}
