import { prefersReducedMotion } from './hooks'

let pending: { rect: DOMRect; at: number } | null = null

/** Remember where a cover is on screen before navigating, so the next view can morph from it. */
export function captureFlip(el: Element | null | undefined) {
  pending = el ? { rect: el.getBoundingClientRect(), at: performance.now() } : null
}

/** Animate `el` from the captured rect to its own position (one shot, 300ms). */
export function playFlip(el: HTMLElement | null) {
  const from = pending
  pending = null
  if (!el || !from || performance.now() - from.at > 1000 || prefersReducedMotion()) return
  const to = el.getBoundingClientRect()
  if (!to.width || !from.rect.width) return
  const scale = from.rect.width / to.width
  const dx = from.rect.left - to.left
  const dy = from.rect.top - to.top
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(scale - 1) < 0.01) return
  el.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    { duration: 300, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  )
}
