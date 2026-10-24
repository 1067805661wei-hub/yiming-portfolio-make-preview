import type { Box } from './types'

export const SIZE = 1080
/** 6% safe margin. */
export const SAFE = 64.8
export const RIGHT = SIZE - SAFE
export const BOTTOM = SIZE - SAFE

/** Shared metadata labels: DM Mono 500. */
export const META_SIZE = 22
/** Baseline that puts the cap height of a metadata label on the top margin. */
export const META_TOP = SAFE + 0.71 * META_SIZE

const n = (v: number) => String(Math.round(v * 100) / 100)

export function rectPath(x: number, y: number, w: number, h: number) {
  return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`
}

export function circlePath(cx: number, cy: number, r: number) {
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`
}

export type Quarter = 'up-left' | 'up-right' | 'down-left' | 'down-right'

/** Quarter disc whose right angle sits at (cx, cy) and which opens toward `dir`. */
export function quarterPath(cx: number, cy: number, r: number, dir: Quarter) {
  const left = dir.endsWith('left')
  const up = dir.startsWith('up')
  const hx = left ? cx - r : cx + r
  const vy = up ? cy - r : cy + r
  const sweep = left === up ? 1 : 0
  return `M${n(cx)} ${n(cy)}L${n(hx)} ${n(cy)}A${n(r)} ${n(r)} 0 0 ${sweep} ${n(cx)} ${n(vy)}Z`
}

export function quarterBox(cx: number, cy: number, r: number, dir: Quarter): Box {
  return {
    x: dir.endsWith('left') ? cx - r : cx,
    y: dir.startsWith('up') ? cy - r : cy,
    w: r,
    h: r,
  }
}

export type Half = 'up' | 'down' | 'left' | 'right'

/** Half disc whose flat side is centered on (cx, cy) and which bulges toward `dir`. */
export function halfPath(cx: number, cy: number, r: number, dir: Half) {
  if (dir === 'left' || dir === 'right') {
    const sweep = dir === 'right' ? 1 : 0
    return `M${n(cx)} ${n(cy - r)}A${n(r)} ${n(r)} 0 0 ${sweep} ${n(cx)} ${n(cy + r)}Z`
  }
  const sweep = dir === 'up' ? 1 : 0
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 0 ${sweep} ${n(cx + r)} ${n(cy)}Z`
}

export function halfBox(cx: number, cy: number, r: number, dir: Half): Box {
  if (dir === 'left') return { x: cx - r, y: cy - r, w: r, h: 2 * r }
  if (dir === 'right') return { x: cx, y: cy - r, w: r, h: 2 * r }
  if (dir === 'up') return { x: cx - r, y: cy - r, w: 2 * r, h: r }
  return { x: cx - r, y: cy, w: 2 * r, h: r }
}

export function polyPath(points: readonly (readonly [number, number])[]) {
  return 'M' + points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'Z'
}

/** Bounding box of points, limited to the visible cover. */
export function polyBox(points: readonly (readonly [number, number])[]): Box {
  const xs = points.map((p) => clamp(p[0], 0, SIZE))
  const ys = points.map((p) => clamp(p[1], 0, SIZE))
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function intersects(a: Box, b: Box) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}
