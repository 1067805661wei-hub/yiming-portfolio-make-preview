import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface ViewportBox {
  height: number
  offsetTop: number
}

function readViewport(): ViewportBox {
  const vv = window.visualViewport
  // Ignore pinch zoom: only the on-screen keyboard should resize the editor.
  if (!vv || vv.scale > 1.01) return { height: window.innerHeight, offsetTop: 0 }
  return { height: vv.height, offsetTop: vv.offsetTop }
}

/** The visible area, which shrinks while a software keyboard is open. */
export function useVisualViewport() {
  const [box, setBox] = useState(readViewport)
  useEffect(() => {
    const update = () => {
      const next = readViewport()
      setBox((cur) => (cur.height === next.height && cur.offsetTop === next.offsetTop ? cur : next))
    }
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    update()
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return box
}

/** Keeps the last non-null value around for `ms` after it clears, so exits can animate. */
export function useExitPresence<T>(value: T | null, ms: number) {
  const [shown, setShown] = useState<T | null>(value)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(timer.current)
    if (value !== null) {
      setShown(value)
      setLeaving(false)
      return
    }
    if (shown === null) return
    if (prefersReducedMotion()) {
      setShown(null)
      return
    }
    setLeaving(true)
    timer.current = window.setTimeout(() => {
      setShown(null)
      setLeaving(false)
    }, ms)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return { shown: value ?? shown, leaving: value === null && leaving }
}
