import { SIZE } from './geometry'
import type { Scene, TextNode } from './types'
import { loadSceneImages, photoPlacement } from './photo'

function paintText(ctx: CanvasRenderingContext2D, node: TextNode, fill = node.fill) {
  ctx.font = `${node.weight} ${node.size}px ${node.family}`
  ctx.textAlign = node.anchor === 'start' ? 'left' : node.anchor === 'middle' ? 'center' : 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = fill
  if (node.fragments) {
    for (const part of node.fragments) {
      const line = node.lines[part.line]
      if (!line?.text) continue
      ctx.save()
      ctx.beginPath()
      ctx.rect(part.clip.x, part.clip.y, part.clip.w, part.clip.h)
      ctx.clip()
      ctx.translate(part.dx, 0)
      ctx.fillText(line.text, line.x, line.y)
      ctx.restore()
    }
    return
  }
  for (const line of node.lines) if (line.text) ctx.fillText(line.text, line.x, line.y)
}

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not open a drawing canvas.')
  ctx.fontKerning = 'normal'
  return ctx
}

/** Paints a scene in the same order as the SVG preview. */
export function paintScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  images: ReadonlyMap<string, CanvasImageSource> = new Map(),
) {
  ctx.save()
  ctx.fillStyle = scene.background
  ctx.fillRect(0, 0, SIZE, SIZE)
  for (const shape of scene.shapes) {
    ctx.fillStyle = shape.fill
    ctx.fill(new Path2D(shape.d), shape.rule)
  }
  for (const node of scene.images) {
    const image = images.get(node.asset.src)
    if (!image) throw new Error('The photo is not ready. Please upload it again and retry.')
    const { source } = photoPlacement(node.asset, node.crop, node.box)
    ctx.drawImage(
      image,
      source.x, source.y, source.w, source.h,
      node.box.x, node.box.y, node.box.w, node.box.h,
    )
  }
  for (const node of scene.texts) paintText(ctx, node)
  const title = scene.title
  if (title) {
    paintText(ctx, title)
    for (const k of scene.knockouts) {
      if (k.mask.kind === 'path') {
        ctx.save()
        ctx.clip(new Path2D(k.mask.d), k.mask.rule)
        paintText(ctx, title, k.fill)
        ctx.restore()
      } else {
        // Text masks: draw the recolored title, keep only where the mask text is, then composite.
        const layer = document.createElement('canvas')
        layer.width = SIZE
        layer.height = SIZE
        const lctx = context(layer)
        paintText(lctx, title, k.fill)
        lctx.globalCompositeOperation = 'destination-in'
        paintText(lctx, k.mask.node)
        ctx.drawImage(layer, 0, 0)
      }
    }
  }
  ctx.restore()
}

/** Draws the scene at exactly 1080 × 1080 and encodes it as PNG. */
export async function renderPng(scene: Scene, cancelled: () => boolean = () => false): Promise<Blob> {
  // Decode every photo before allocating or painting the export canvas.
  const images = await loadSceneImages(scene)
  if (cancelled()) throw new DOMException('Export was cancelled.', 'AbortError')
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  paintScene(context(canvas), scene, images)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob || blob.size === 0) throw new Error('The browser could not encode the PNG.')
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob).catch(() => null)
    if (bitmap) {
      const ok = bitmap.width === SIZE && bitmap.height === SIZE
      bitmap.close()
      if (!ok) throw new Error(`The PNG came out at the wrong size instead of ${SIZE} × ${SIZE}.`)
    }
  }
  return blob
}

/** sleeve-<title>.png, keeping letters, numbers and marks from any script. */
export function fileNameFor(title: string) {
  const slug = title
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  const short = Array.from(slug).slice(0, 48).join('').replace(/-+$/, '')
  return `sleeve-${short || 'cover'}.png`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
