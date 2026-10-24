import { CJK_METRICS, FONTS, onFontsChanged, type FontDef } from './fonts'

// ---------------------------------------------------------------------------
// Graphemes. Limits count what people see as characters, not UTF-16 units.

interface GraphemeSegmenter {
  segment(input: string): Iterable<{ segment: string }>
}
type SegmenterCtor = new (
  locales?: string | string[],
  options?: { granularity: 'grapheme' },
) => GraphemeSegmenter

const Segmenter = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter
const segmenter = Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : null

export function graphemes(text: string): string[] {
  if (!text) return []
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text)
}

/** Visible characters; line breaks do not count. */
export function countChars(text: string) {
  return graphemes(text.replace(/\n/g, '')).length
}

export const TITLE_MAX_CHARS = 40
export const TITLE_MAX_LINES = 3
export const SUBTITLE_MAX_CHARS = 60

export function normalizeInput(text: string, maxLines: number) {
  const v = text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ')
  return maxLines === 1 ? v.replace(/\n+/g, ' ') : v
}

export interface LimitResult {
  value: string
  /** Caret position to restore when the edit was changed. */
  caret: number | null
  limited: null | 'chars' | 'lines'
}

/**
 * Applies character and line limits to an edit. Only the newly inserted text is
 * trimmed, so typing or pasting in the middle never pushes text off the end.
 * Extra line breaks in the insertion are turned into spaces.
 */
export function applyLimit(prev: string, next: string, maxChars: number, maxLines: number): LimitResult {
  const value = normalizeInput(next, maxLines)
  let start = 0
  while (start < prev.length && start < value.length && prev[start] === value[start]) start++
  let endPrev = prev.length
  let endNext = value.length
  while (endPrev > start && endNext > start && prev[endPrev - 1] === value[endNext - 1]) {
    endPrev--
    endNext--
  }
  const head = value.slice(0, start)
  const tail = value.slice(endNext)
  let inserted = value.slice(start, endNext)
  let limited: LimitResult['limited'] = null

  const breaksIn = (s: string) => (s.match(/\n/g) ?? []).length
  const allowedBreaks = Math.max(0, maxLines - 1 - breaksIn(head) - breaksIn(tail))
  if (breaksIn(inserted) > allowedBreaks) {
    let kept = 0
    inserted = inserted.replace(/\n/g, () => (kept++ < allowedBreaks ? '\n' : ' '))
    limited = 'lines'
  }

  const room = Math.max(0, maxChars - countChars(head) - countChars(tail))
  if (countChars(inserted) > room) {
    let kept = ''
    let n = 0
    for (const g of graphemes(inserted)) {
      if (g !== '\n') {
        if (n >= room) break
        n++
      }
      kept += g
    }
    inserted = kept
    limited = 'chars'
  }

  const out = head + inserted + tail
  return { value: out, caret: out === next ? null : (head + inserted).length, limited }
}

/** Hard clamp used when restoring stored drafts. */
export function clampText(text: string, maxChars: number, maxLines: number) {
  return applyLimit('', text, maxChars, maxLines).value
}

// ---------------------------------------------------------------------------
// Measurement. Widths are measured once at 100px and scaled.

export const REF_SIZE = 100
let measureCtx: CanvasRenderingContext2D | null | undefined
const widthCache = new Map<string, number>()

export function clearMeasureCache() {
  widthCache.clear()
}
onFontsChanged(clearMeasureCache)

export function measureRef(family: string, weight: number, text: string) {
  if (!text) return 0
  const key = `${weight}|${family}|${text}`
  const hit = widthCache.get(key)
  if (hit !== undefined) return hit
  if (measureCtx === undefined) {
    measureCtx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  let width: number
  if (measureCtx) {
    measureCtx.font = `${weight} ${REF_SIZE}px ${family}`
    measureCtx.fontKerning = 'normal'
    width = measureCtx.measureText(text).width
  } else {
    width = graphemes(text).length * 0.6 * REF_SIZE
  }
  widthCache.set(key, width)
  return width
}

// ---------------------------------------------------------------------------
// Line breaking. Latin words stay whole; CJK breaks between characters while
// keeping closing punctuation off line starts and opening brackets off line ends.

const CJK_RE =
  /[\u1100-\u11ff\u2e80-\u2fdf\u2ff0-\u303f\u3040-\u31ff\u3200-\u9fff\ua960-\ua97f\uac00-\ud7ff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]|[\ud840-\ud87f][\udc00-\udfff]/
const NO_LINE_START = new Set(
  Array.from(
    '、。，．,.:;：；!?！？)]}）】」』〉》〕〗〙〛’”…‥ー〜～・%‰℃°々ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ',
  ),
)
const NO_LINE_END = new Set(Array.from('([{（【「『〈《〔〖〘〚‘“'))

export function hasCJK(text: string) {
  return CJK_RE.test(text)
}

interface Unit {
  text: string
  /** A space separates this unit from the previous one. */
  space: boolean
}

function atomize(word: string): string[] {
  const atoms: string[] = []
  let run = ''
  let opening = ''
  const push = (a: string) => {
    atoms.push(opening + a)
    opening = ''
  }
  for (const g of graphemes(word)) {
    if (NO_LINE_START.has(g)) {
      if (run) run += g
      else if (atoms.length) atoms[atoms.length - 1] += g
      else run = g
    } else if (NO_LINE_END.has(g)) {
      if (run) {
        push(run)
        run = ''
      }
      opening += g
    } else if (CJK_RE.test(g)) {
      if (run) {
        push(run)
        run = ''
      }
      push(g)
    } else {
      run += g
    }
  }
  if (run) push(run)
  if (opening) {
    if (atoms.length) atoms[atoms.length - 1] += opening
    else atoms.push(opening)
  }
  return atoms
}

function toUnits(paragraph: string): Unit[] {
  const units: Unit[] = []
  for (const word of paragraph.split(' ')) {
    if (!word) continue
    atomize(word).forEach((text, i) => units.push({ text, space: i === 0 && units.length > 0 }))
  }
  return units
}

function join(line: string, unit: Unit) {
  return line ? line + (unit.space ? ' ' : '') + unit.text : unit.text
}

function greedy(units: readonly Unit[], fits: (s: string) => boolean) {
  const lines: string[] = []
  let line = ''
  let overflow = false
  for (const unit of units) {
    const candidate = join(line, unit)
    if (!line || fits(candidate)) {
      if (!line && !fits(unit.text)) overflow = true
      line = candidate
      continue
    }
    lines.push(line)
    line = unit.text
    if (!fits(line)) overflow = true
  }
  if (line) lines.push(line)
  return { lines, overflow }
}

/** Narrowest wrap that keeps the same number of lines, so lines come out even. */
function balance(units: readonly Unit[], count: number, widthOf: (s: string) => number, maxWidth: number) {
  let lo = Math.max(...units.map((u) => widthOf(u.text)))
  let hi = maxWidth
  let best = greedy(units, (s) => widthOf(s) <= hi + 0.01).lines
  for (let i = 0; i < 14 && hi - lo > 0.5; i++) {
    const mid = (lo + hi) / 2
    const r = greedy(units, (s) => widthOf(s) <= mid + 0.01)
    if (!r.overflow && r.lines.length <= count) {
      hi = mid
      best = r.lines
    } else {
      lo = mid
    }
  }
  return best
}

function splitUnit(unit: Unit, fits: (s: string) => boolean): Unit[] {
  const out: Unit[] = []
  let cur = ''
  for (const g of graphemes(unit.text)) {
    if (cur && !fits(cur + g)) {
      out.push({ text: cur, space: out.length === 0 && unit.space })
      cur = g
    } else {
      cur += g
    }
  }
  if (cur) out.push({ text: cur, space: out.length === 0 && unit.space })
  return out
}

function toParagraphs(text: string) {
  const ps = normalizeInput(text, 3)
    .split('\n')
    .map((p) => p.replace(/ +/g, ' ').trim())
  while (ps.length && !ps[0]) ps.shift()
  while (ps.length && !ps[ps.length - 1]) ps.pop()
  return ps
}

// ---------------------------------------------------------------------------
// Title fitting.

export interface TitleSpec {
  font: FontDef
  weight: number
  requested: number
  min: number
  maxWidth: number
  maxHeight: number
}

export interface TitleFit {
  status: 'ok' | 'empty' | 'overflow'
  requested: number
  size: number
  lines: string[]
  widths: number[]
  width: number
  /** Cap height of the first line to the last baseline. */
  height: number
  /** Ascent and line advance as shares of the size. */
  asc: number
  lh: number
  reason?: 'word' | 'lines' | 'height'
  word?: string
}

export function fitTitle(text: string, spec: TitleSpec): TitleFit {
  const paragraphs = toParagraphs(text)
  const cjk = hasCJK(text)
  const asc = cjk ? Math.max(spec.font.cap, CJK_METRICS.cap) : spec.font.cap
  const lh = cjk ? Math.max(spec.font.lineHeight, CJK_METRICS.lineHeight) : spec.font.lineHeight
  const requested = Math.round(spec.requested)
  if (paragraphs.length === 0) {
    return { status: 'empty', requested, size: requested, lines: [], widths: [], width: 0, height: asc * requested, asc, lh }
  }

  const unitLists = paragraphs.map(toUnits)
  const widthAt = (size: number) => (s: string) => (measureRef(spec.font.family, spec.weight, s) * size) / REF_SIZE
  const layoutAt = (size: number) => {
    const widthOf = widthAt(size)
    const fits = (s: string) => widthOf(s) <= spec.maxWidth + 0.01
    const per: string[][] = []
    let overflow = false
    for (const units of unitLists) {
      if (units.length === 0) {
        per.push([''])
        continue
      }
      const r = greedy(units, fits)
      per.push(r.lines)
      overflow = overflow || r.overflow
    }
    return { per, overflow, count: per.reduce((n, p) => n + p.length, 0), widthOf }
  }

  const min = Math.min(Math.round(spec.min), requested)
  for (let size = requested; size >= min; size--) {
    const r = layoutAt(size)
    if (r.overflow || r.count > TITLE_MAX_LINES) continue
    const height = (asc + (r.count - 1) * lh) * size
    if (height > spec.maxHeight + 0.01) continue
    const lines = unitLists.flatMap((units, i) =>
      r.per[i].length > 1 ? balance(units, r.per[i].length, r.widthOf, spec.maxWidth) : r.per[i],
    )
    const widths = lines.map(r.widthOf)
    return { status: 'ok', requested, size, lines, widths, width: Math.max(0, ...widths), height, asc, lh }
  }

  // Nothing fits: keep the minimum-size layout visible and explain why.
  const r = layoutAt(min)
  const lines = r.per.flat()
  const widths = lines.map(r.widthOf)
  const word = unitLists
    .flat()
    .map((u) => u.text)
    .find((t) => r.widthOf(t) > spec.maxWidth + 0.01)
  const reason = word ? 'word' : lines.length > TITLE_MAX_LINES ? 'lines' : 'height'
  return {
    status: 'overflow',
    requested,
    size: min,
    lines,
    widths,
    width: Math.max(0, ...widths),
    height: (asc + (lines.length - 1) * lh) * min,
    asc,
    lh,
    reason,
    word,
  }
}

// ---------------------------------------------------------------------------
// Subtitle fitting: DM Mono 400, 26px stepping down to 20px.

export const SUBTITLE_WEIGHT = 400
const SUBTITLE_SIZES = [26, 25, 24, 23, 22, 21, 20]

export interface SubtitleFit {
  size: number
  lines: string[]
  asc: number
  lh: number
}

export function fitSubtitle(text: string, maxWidth: number, maxLines: number): SubtitleFit | null {
  const p = normalizeInput(text, 1).replace(/ +/g, ' ').trim()
  if (!p) return null
  const font = FONTS.mono
  const asc = hasCJK(p) ? CJK_METRICS.cap : font.cap
  const lh = 1.4
  const units = toUnits(p)
  let size = SUBTITLE_SIZES[0]
  let lines: string[] = []
  let widthOf = (s: string) => s.length
  for (const candidate of SUBTITLE_SIZES) {
    size = candidate
    widthOf = (s: string) => (measureRef(font.family, SUBTITLE_WEIGHT, s) * candidate) / REF_SIZE
    const fits = (s: string) => widthOf(s) <= maxWidth + 0.01
    const split = units.flatMap((u) => (fits(u.text) ? [u] : splitUnit(u, fits)))
    lines = greedy(split, fits).lines
    if (lines.length <= maxLines) {
      if (lines.length > 1) lines = balance(split, lines.length, widthOf, maxWidth)
      return { size, lines, asc, lh }
    }
  }
  // Still too long at the smallest size: end the last line with an ellipsis.
  lines = lines.slice(0, maxLines)
  let last = graphemes(lines[maxLines - 1])
  while (last.length && widthOf(last.join('').trimEnd() + '…') > maxWidth) last = last.slice(0, -1)
  lines[maxLines - 1] = last.join('').trimEnd() + '…'
  return { size, lines, asc, lh }
}
