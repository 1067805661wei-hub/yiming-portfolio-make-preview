import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { CoverArt } from "../cover/CoverArt"
import type { Scene } from "../cover/types"
import { useReducedMotion } from "../lib/hooks"
import "./sleeve-motion.css"

interface SleeveTransitionProps {
  templateKey: string
  scene: Scene
  children: ReactNode
}

interface SleeveChange {
  id: number
  previous: Scene
}

/**
 * A paper-sleeve changeover, rather than a transition on the artwork itself.
 * The live stage is never keyed or cloned, so editing, focus, and export refs
 * retain their identities. Only changing templateKey starts a changeover.
 */
export function SleeveTransition({
  templateKey,
  scene,
  children,
}: SleeveTransitionProps) {
  const reducedMotion = useReducedMotion()
  const snapshot = useRef({ templateKey, scene })
  const serial = useRef(0)
  const animations = useRef<Animation[]>([])
  const live = useRef<HTMLDivElement>(null)
  const previous = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const [change, setChange] = useState<SleeveChange | null>(null)

  const cancelAnimations = () => {
    for (const animation of animations.current) animation.cancel()
    animations.current = []
  }

  useLayoutEffect(() => {
    const from = snapshot.current
    snapshot.current = { templateKey, scene }

    if (reducedMotion) {
      cancelAnimations()
      setChange(null)
      return
    }
    if (from.templateKey === templateKey) return

    // Replace an interrupted changeover immediately; never queue old switches.
    cancelAnimations()
    setChange({ id: ++serial.current, previous: from.scene })
  }, [templateKey, scene, reducedMotion])

  useLayoutEffect(() => {
    if (!change || reducedMotion) return
    const face = live.current
    const oldFace = previous.current
    const backing = paper.current
    if (!face || !oldFace || !backing || typeof face.animate !== "function") {
      setChange(null)
      return
    }

    const options: KeyframeAnimationOptions = {
      duration: 460,
      easing: "cubic-bezier(0.22, 0.72, 0.22, 1)",
      fill: "both",
    }
    const incoming = face.animate(
      [
        { transform: "translate(11%, 1.4%) rotate(1.7deg)", offset: 0 },
        { transform: "translate(-0.45%, -0.15%) rotate(-0.16deg)", offset: 0.8 },
        { transform: "translate(0, 0) rotate(0deg)", offset: 1 },
      ],
      options,
    )
    const outgoing = oldFace.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1, offset: 0 },
        { transform: "translate(-6.5%, 0.8%) rotate(-1.2deg)", opacity: 0.65, offset: 0.62 },
        { transform: "translate(-7.5%, 1%) rotate(-1.4deg)", opacity: 0, offset: 1 },
      ],
      options,
    )
    const stock = backing.animate(
      [
        { transform: "translate(1%, 1%) rotate(-1deg)", opacity: 0.8 },
        { transform: "translate(0.25%, 0.25%) rotate(-0.2deg)", opacity: 0.3, offset: 0.7 },
        { transform: "translate(0, 0) rotate(0deg)", opacity: 0 },
      ],
      options,
    )
    animations.current = [incoming, outgoing, stock]
    let active = true

    // Cancellation rejects finished; an interrupted animation is expected.
    void incoming.finished.then(
      () => {
        if (!active) return
        cancelAnimations()
        setChange((current) => current?.id === change.id ? null : current)
      },
      () => {},
    )

    return () => {
      active = false
      cancelAnimations()
    }
  }, [change, reducedMotion])

  return (
    <div className="sleeve-motion" data-switching={change ? "true" : undefined}>
      {change && !reducedMotion && (
        <>
          <div ref={paper} className="sleeve-motion__stock" aria-hidden="true" />
          <div ref={previous} className="sleeve-motion__previous" aria-hidden="true">
            <CoverArt scene={change.previous} className="sleeve-motion__art" />
          </div>
        </>
      )}
      <div ref={live} className="sleeve-motion__live">
        {children}
      </div>
    </div>
  )
}
