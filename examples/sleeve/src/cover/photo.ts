import type { Box, PhotoAsset, PhotoCrop, Scene } from './types'

export const DEFAULT_CROP: PhotoCrop = { x: 50, y: 50, zoom: 1 }
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024
const MAX_EDGE = 1600
const MAX_DATA_LENGTH = 2_400_000

export const DEMO_PHOTO: PhotoAsset = {
  src: import.meta.env.BASE_URL + 'demo-window.png',
  width: 1536,
  height: 1024,
  name: 'AI-generated architectural demo image',
}

const finite = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function sanitizeCrop(value: unknown): PhotoCrop {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    x: clamp(finite(v.x, 50), 0, 100),
    y: clamp(finite(v.y, 50), 0, 100),
    zoom: clamp(finite(v.zoom, 1), 1, 3),
  }
}

/** Persisted user images must be local raster data, never an external URL or SVG. */
export function sanitizePhoto(value: unknown): PhotoAsset | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.src !== 'string' || v.src.length > MAX_DATA_LENGTH) return null
  if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(v.src)) return null
  const width = finite(v.width, 0)
  const height = finite(v.height, 0)
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width < 1 || height < 1 || width > MAX_EDGE || height > MAX_EDGE) return null
  return {
    src: v.src,
    width,
    height,
    name: typeof v.name === 'string'
      ? v.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120) || 'Your photo'
      : 'Your photo',
  }
}

/** One crop calculation is used by the SVG preview and Canvas export. */
export function photoPlacement(asset: PhotoAsset, value: PhotoCrop, box: Box) {
  const crop = sanitizeCrop(value)
  const scale = Math.max(box.w / asset.width, box.h / asset.height) * crop.zoom
  const w = Math.min(asset.width, box.w / scale)
  const h = Math.min(asset.height, box.h / scale)
  const x = Math.max(0, asset.width - w) * crop.x / 100
  const y = Math.max(0, asset.height - h) * crop.y / 100
  return {
    source: { x, y, w, h },
    display: {
      x: box.x - x * scale,
      y: box.y - y * scale,
      w: asset.width * scale,
      h: asset.height * scale,
    },
  }
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    const timer = window.setTimeout(() => {
      image.onload = null
      image.onerror = null
      image.src = ''
      reject(new Error('The photo took too long to open. Please upload it again.'))
    }, 20000)
    const clear = () => {
      window.clearTimeout(timer)
      image.onload = null
      image.onerror = null
    }
    image.onload = () => {
      const decoded = typeof image.decode === 'function' ? image.decode() : Promise.resolve()
      void decoded.then(() => {
        clear()
        if (!image.naturalWidth || !image.naturalHeight) {
          reject(new Error('This image has no readable dimensions. Please choose another file.'))
        } else {
          resolve(image)
        }
      }).catch(() => {
        clear()
        reject(new Error('The photo could not be decoded. Please choose another image.'))
      })
    }
    image.onerror = () => {
      clear()
      reject(new Error('The photo could not be decoded. Please choose a valid JPEG, PNG or WebP.'))
    }
    image.src = src
  })
}

// Keep only a few decoded, resized images; replacing photos must not retain a large gallery in memory.
const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function loadPhotoImage(asset: PhotoAsset) {
  const hit = imageCache.get(asset.src)
  if (hit) return hit
  const promise = decodeImage(asset.src).then((image) => {
    if (image.naturalWidth !== asset.width || image.naturalHeight !== asset.height) {
      throw new Error('The saved photo dimensions do not match. Please upload the photo again.')
    }
    return image
  }).catch((err: unknown) => {
    imageCache.delete(asset.src)
    throw err
  })
  imageCache.set(asset.src, promise)
  while (imageCache.size > 3) imageCache.delete(imageCache.keys().next().value!)
  return promise
}

export async function loadSceneImages(scene: Scene): Promise<ReadonlyMap<string, CanvasImageSource>> {
  const entries = await Promise.all(scene.images.map(async ({ asset }) =>
    [asset.src, await loadPhotoImage(asset)] as const))
  return new Map(entries)
}

/** File data never leaves this browser. Large originals are released after resizing. */
export async function readPhotoFile(file: File): Promise<PhotoAsset> {
  if (!file.size) throw new Error('This file is empty. Please choose another photo.')
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo smaller than 15 MB.')
  const accepted = /^(image\/jpeg|image\/png|image\/webp)$/.test(file.type) ||
    (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name))
  if (!accepted) throw new Error('Use a JPEG, PNG or WebP image.')
  const url = URL.createObjectURL(file)
  let image: HTMLImageElement | null = null
  try {
    image = await decodeImage(url)
    const originalWidth = image.naturalWidth
    const originalHeight = image.naturalHeight
    if (originalWidth * originalHeight > 80_000_000) {
      throw new Error('This image is too large to edit here. Resize it below 80 megapixels first.')
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(originalWidth, originalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(originalWidth * scale))
    canvas.height = Math.max(1, Math.round(originalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser could not resize the image.')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    // WebP keeps transparency and makes session persistence less likely to hit its quota.
    let src = canvas.toDataURL('image/webp', 0.86)
    if (src.length > MAX_DATA_LENGTH) src = canvas.toDataURL('image/webp', 0.68)
    if (src.length > MAX_DATA_LENGTH) {
      throw new Error('This image is still too large after resizing. Please use a smaller photo.')
    }
    const asset = { src, width: canvas.width, height: canvas.height, name: file.name.slice(0, 120) }
    canvas.width = 1
    canvas.height = 1
    await loadPhotoImage(asset)
    return asset
  } finally {
    if (image) image.src = ''
    URL.revokeObjectURL(url)
  }
}

// Avoid putting a multi-megabyte data URL into every memo key during dragging.
const photoIds = new WeakMap<PhotoAsset, number>()
let nextPhotoId = 0
export function photoKey(photo: PhotoAsset | null) {
  if (!photo) return 'demo'
  let id = photoIds.get(photo)
  if (id === undefined) {
    id = ++nextPhotoId
    photoIds.set(photo, id)
  }
  return String(id)
}
