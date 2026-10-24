import { useSyncExternalStore } from 'react'
import { FONTS, isFontId, weightFor } from '../cover/fonts'
import { BOTTOM, RIGHT, SAFE, clamp } from '../cover/geometry'
import { isPaletteId } from '../cover/palettes'
import { TEMPLATE_BY_ID, isTemplateId } from '../cover/templates'
import { SUBTITLE_MAX_CHARS, TITLE_MAX_CHARS, TITLE_MAX_LINES, clampText } from '../cover/text'
import { DEFAULT_CROP, sanitizeCrop, sanitizePhoto } from '../cover/photo'
import type { Align, CoverInput, FontId, PaletteId, PhotoAsset, PhotoCrop, TemplateId } from '../cover/types'

/** Per-template layout memory: revisiting a template restores where the title was. */
export interface LayoutState {
  size?: number
  align?: Align
  x?: number | null
  y?: number | null
}

export interface Draft {
  v: 1
  templateId: TemplateId
  title: string
  subtitle: string
  font: FontId
  weight: number
  /** Once the font is chosen by hand it no longer follows template defaults. */
  fontEdited: boolean
  /** null = use each template's own palette. */
  paletteId: PaletteId | null
  layouts: Partial<Record<TemplateId, LayoutState>>
  photo: PhotoAsset | null
  crop: PhotoCrop
}

export function createDraft(id: TemplateId): Draft {
  const t = TEMPLATE_BY_ID[id]
  return {
    v: 1,
    templateId: id,
    title: t.sample.title,
    subtitle: t.sample.subtitle,
    font: 'grotesk',
    weight: t.weight,
    fontEdited: false,
    paletteId: null,
    layouts: {},
    photo: null,
    crop: { ...DEFAULT_CROP },
  }
}

/** Untouched sample text follows the new template; anything the user typed stays. */
export function switchTemplate(d: Draft, id: TemplateId): Draft {
  if (d.templateId === id) return d
  const from = TEMPLATE_BY_ID[d.templateId]
  const to = TEMPLATE_BY_ID[id]
  return {
    ...d,
    templateId: id,
    title: d.title === from.sample.title ? to.sample.title : d.title,
    subtitle: d.subtitle === from.sample.subtitle ? to.sample.subtitle : d.subtitle,
    font: d.fontEdited ? d.font : 'grotesk',
    weight: d.fontEdited ? d.weight : to.weight,
  }
}

export function layoutOf(d: Draft): LayoutState {
  return d.layouts[d.templateId] ?? {}
}

export function withLayout(d: Draft, patch: LayoutState): Draft {
  return { ...d, layouts: { ...d.layouts, [d.templateId]: { ...layoutOf(d), ...patch } } }
}

export function toCoverInput(d: Draft): CoverInput {
  const t = TEMPLATE_BY_ID[d.templateId]
  const l = layoutOf(d)
  return {
    templateId: d.templateId,
    paletteId: d.paletteId ?? t.palette,
    title: d.title,
    subtitle: d.subtitle,
    font: d.font,
    weight: d.weight,
    size: clamp(Math.round(l.size ?? t.title.size), t.title.min, t.title.max),
    align: l.align ?? t.title.align,
    x: l.x ?? null,
    y: l.y ?? null,
    photo: d.photo ?? null,
    crop: d.crop ?? { ...DEFAULT_CROP },
  }
}

/** True when the title sits at the template's default alignment and position. */
export function isDefaultPosition(d: Draft) {
  const l = layoutOf(d)
  const t = TEMPLATE_BY_ID[d.templateId]
  return (l.align ?? t.title.align) === t.title.align && l.x == null && l.y == null
}

// ---------------------------------------------------------------------------
// Session persistence. Drafts live only in this tab's sessionStorage.

const KEY = 'sleeve.draft.v1'
const PHOTO_KEY = KEY + '.photo'

export type DraftStorageStatus = 'saved' | 'memory'
let storageStatus: DraftStorageStatus = 'saved'
let storageMessage: string | null = null
let memoryDraft: Draft | null | undefined
let storedPhotoSrc: string | null | undefined
let missingRestoredPhoto = false
const storageListeners = new Set<() => void>()

function setStorageStatus(status: DraftStorageStatus, message: string | null = null) {
  if (status === storageStatus && message === storageMessage) return
  storageStatus = status
  storageMessage = message
  storageListeners.forEach((listener) => listener())
}

function subscribeStorage(listener: () => void) {
  storageListeners.add(listener)
  return () => { storageListeners.delete(listener) }
}

export function useDraftStorageStatus() {
  return useSyncExternalStore(subscribeStorage, () => storageStatus, () => 'saved' as DraftStorageStatus)
}

export function useDraftStorageMessage() {
  return useSyncExternalStore(subscribeStorage, () => storageMessage, () => null)
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

function sanitizeLayout(value: unknown): LayoutState | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  const out: LayoutState = {}
  const size = num(v.size)
  if (size !== undefined) out.size = Math.round(size)
  if (v.align === 'left' || v.align === 'center' || v.align === 'right') out.align = v.align
  const x = num(v.x)
  const y = num(v.y)
  if (x !== undefined) out.x = clamp(x, SAFE, RIGHT)
  if (y !== undefined) out.y = clamp(y, SAFE, BOTTOM)
  return out
}

export function sanitizeDraft(value: unknown): Draft | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (v.v !== 1 || !isTemplateId(v.templateId)) return null
  if (typeof v.title !== 'string' || typeof v.subtitle !== 'string') return null
  const font = isFontId(v.font) ? v.font : 'grotesk'
  const layouts: Draft['layouts'] = {}
  if (v.layouts && typeof v.layouts === 'object') {
    for (const [id, layout] of Object.entries(v.layouts as Record<string, unknown>)) {
      const clean = sanitizeLayout(layout)
      if (isTemplateId(id) && clean) layouts[id] = clean
    }
  }
  return {
    v: 1,
    templateId: v.templateId,
    title: clampText(v.title, TITLE_MAX_CHARS, TITLE_MAX_LINES),
    subtitle: clampText(v.subtitle, SUBTITLE_MAX_CHARS, 1),
    font,
    weight: weightFor(font, num(v.weight) ?? FONTS[font].weights[1].value),
    fontEdited: v.fontEdited === true,
    paletteId: isPaletteId(v.paletteId) ? v.paletteId : null,
    layouts,
    photo: sanitizePhoto(v.photo),
    crop: sanitizeCrop(v.crop),
  }
}

export function loadDraft(): Draft | null {
  if (memoryDraft !== undefined) return memoryDraft
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return memoryDraft = null
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' &&
        (parsed as Record<string, unknown>).photoStored === true) {
      const photoRaw = window.sessionStorage.getItem(PHOTO_KEY)
      let photo: PhotoAsset | null = null
      try {
        photo = photoRaw ? sanitizePhoto(JSON.parse(photoRaw)) : null
      } catch { /* Preserve the text and layout even if the stored image was damaged. */ }
      storedPhotoSrc = photo?.src ?? null
      if (!photo) {
        missingRestoredPhoto = true
        setStorageStatus('memory', 'Your saved photo could not be restored. Upload it again before exporting.')
      }
      return memoryDraft = sanitizeDraft({ ...parsed, photo })
    }
    return memoryDraft = sanitizeDraft(parsed)
  } catch {
    setStorageStatus('memory', 'Browser storage is unavailable. Changes stay in this page only; download before reloading.')
    return memoryDraft = null
  }
}

/** Returns false when the browser refused to store the draft. */
export function saveDraft(d: Draft | null) {
  memoryDraft = d
  try {
    if (d) {
      if (d.photo) {
        if (storedPhotoSrc !== d.photo.src) {
          window.sessionStorage.setItem(PHOTO_KEY, JSON.stringify(d.photo))
          storedPhotoSrc = d.photo.src
        }
        missingRestoredPhoto = false
      } else {
        window.sessionStorage.removeItem(PHOTO_KEY)
        storedPhotoSrc = null
      }
      // Keep the image separate: moving a slider only serializes the small draft metadata.
      window.sessionStorage.setItem(KEY, JSON.stringify({ ...d, photo: null, photoStored: !!d.photo }))
    } else {
      window.sessionStorage.removeItem(KEY)
      window.sessionStorage.removeItem(PHOTO_KEY)
      storedPhotoSrc = null
      missingRestoredPhoto = false
    }
    if (!missingRestoredPhoto) setStorageStatus('saved')
    return true
  } catch {
    storedPhotoSrc = undefined
    // Do not leave an older, apparently current draft behind after a quota failure.
    try {
      window.sessionStorage.removeItem(KEY)
      window.sessionStorage.removeItem(PHOTO_KEY)
    } catch { /* Storage itself may be disabled. The live draft remains in React and memory. */ }
    setStorageStatus('memory', 'Browser storage is full or unavailable. Changes stay in this page only; download before reloading.')
    return false
  }
}
