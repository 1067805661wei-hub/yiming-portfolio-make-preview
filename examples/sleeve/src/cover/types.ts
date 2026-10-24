export type TemplateId = 'orbit' | 'typecut' | 'pulse' | 'patchwork' | 'diagonal' | 'index' | 'window'
export type PaletteId = 'midnight' | 'brick' | 'ember' | 'sage' | 'volt' | 'blush'
export type FontId = 'grotesk' | 'mono'
export type Align = 'left' | 'center' | 'right'

/** A decoded, locally resized image. Uploaded photos use an embedded data URL. */
export interface PhotoAsset {
  src: string
  width: number
  height: number
  name: string
}

/** Position is a percentage of the available crop; zoom is 1–3. */
export interface PhotoCrop {
  x: number
  y: number
  zoom: number
}

/** Everything needed to compose one cover. Coordinates are in 1080 × 1080 cover space. */
export interface CoverInput {
  templateId: TemplateId
  paletteId: PaletteId
  title: string
  subtitle: string
  font: FontId
  weight: number
  /** Requested title size in px; the layout may shrink it to fit. */
  size: number
  align: Align
  /** Horizontal anchor: left edge, center or right edge depending on `align`. null = template default. */
  x: number | null
  /** Vertical anchor: top or bottom edge depending on the template. null = template default. */
  y: number | null
  photo: PhotoAsset | null
  crop: PhotoCrop
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export type FillRule = 'nonzero' | 'evenodd'

export interface ShapeNode {
  d: string
  fill: string
  rule: FillRule
  box: Box
}

export interface ImageNode {
  asset: PhotoAsset
  crop: PhotoCrop
  box: Box
}

export interface TextLine {
  text: string
  x: number
  y: number
}

export interface TextNode {
  id: string
  family: string
  weight: number
  size: number
  fill: string
  anchor: 'start' | 'middle' | 'end'
  lines: TextLine[]
  /** Optional letter fragments, used for the TYPE CUT print misregistration. */
  fragments?: TextFragment[]
}

export interface TextFragment {
  line: number
  clip: Box
  dx: number
}

export type KnockoutMask =
  | { kind: 'path'; d: string; rule: FillRule }
  | { kind: 'text'; node: TextNode }

/** The title redrawn in another color, clipped to a shape it overlaps, so it stays readable. */
export interface Knockout {
  mask: KnockoutMask
  fill: string
}

/** Paint order: background, shapes, images, texts, title, knockouts. */
export interface Scene {
  background: string
  shapes: ShapeNode[]
  images: ImageNode[]
  texts: TextNode[]
  title: TextNode | null
  knockouts: Knockout[]
}

export type TitleStatus = 'ok' | 'empty' | 'overflow'

export interface TitleLayout {
  status: TitleStatus
  /** Problem description when status is not ok. */
  message: string | null
  requested: number
  size: number
  /** True when the title was set smaller than requested to fit. */
  fitted: boolean
  lines: string[]
  /** Placed title block (cap height of the first line to the last baseline). */
  box: Box
  anchorY: 'top' | 'bottom'
  align: Align
}

export interface CoverResult {
  scene: Scene
  title: TitleLayout
}
