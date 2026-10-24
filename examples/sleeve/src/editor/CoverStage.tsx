import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react"
import { CoverArt } from "../cover/CoverArt"
import { BOTTOM, RIGHT, SAFE, SIZE, clamp } from "../cover/geometry"
import type { Box, CoverResult, TitleLayout } from "../cover/types"
import { cn } from "../lib/cn"

export interface Guide {
  axis: "x" | "y"
  at: number
  kind: "center" | "margin"
}

/** Snaps a title box to the safe margins and the center lines. */
export function snapBox(b: Box, threshold: number) {
  let x = clamp(b.x, SAFE, Math.max(SAFE, RIGHT - b.w))
  let y = clamp(b.y, SAFE, Math.max(SAFE, BOTTOM - b.h))
  const guides: Guide[] = []
  const pick = (candidates: [number, number, Guide["kind"]][]) => {
    let best: [number, number, Guide["kind"]] | null = null
    for (const c of candidates)
      if (
        Math.abs(c[0]) <= threshold &&
        (!best || Math.abs(c[0]) < Math.abs(best[0]))
      )
        best = c
    return best
  }
  const sx = pick([
    [x - SAFE, SAFE, "margin"],
    [x + b.w / 2 - SIZE / 2, SIZE / 2, "center"],
    [x + b.w - RIGHT, RIGHT, "margin"],
  ])
  if (sx) {
    x -= sx[0]
    guides.push({ axis: "x", at: sx[1], kind: sx[2] })
  }
  const sy = pick([
    [y - SAFE, SAFE, "margin"],
    [y + b.h / 2 - SIZE / 2, SIZE / 2, "center"],
    [y + b.h - BOTTOM, BOTTOM, "margin"],
  ])
  if (sy) {
    y -= sy[0]
    guides.push({ axis: "y", at: sy[1], kind: sy[2] })
  }
  return { x, y, guides }
}

/** Converts a box position to the stored anchor, which depends on alignment and template anchoring. */
export function anchorFor(t: TitleLayout, x: number, y: number) {
  return {
    x:
      t.align === "left"
        ? x
        : t.align === "center"
          ? x + t.box.w / 2
          : x + t.box.w,
    y: t.anchorY === "top" ? y : y + t.box.h,
  }
}

export function describeGuides(guides: Guide[]) {
  const parts = guides.map((g) =>
    g.kind === "center"
      ? g.axis === "x"
        ? "centered across"
        : "centered down"
      : g.axis === "x"
        ? g.at === SAFE
          ? "on the left margin"
          : "on the right margin"
        : g.at === SAFE
          ? "on the top margin"
          : "on the bottom margin",
  )
  return parts.length ? `Snapped ${parts.join(", ")}` : null
}

const pct = (v: number) => `${(v / SIZE) * 100}%`

interface CoverStageProps {
  result: CoverResult
  label: string
  selected: boolean
  onSelect(selected: boolean): void
  onMove(anchor: { x: number, y: number }): void
  onGuides?(guides: Guide[] | null): void
  stageRef?: Ref<HTMLDivElement>
  helpId?: string
}

export function CoverStage({
  result,
  label,
  selected,
  onSelect,
  onMove,
  onGuides,
  stageRef,
  helpId,
}: CoverStageProps) {
  const drag = useRef<{
    id: number
    sx: number
    sy: number
    x0: number
    y0: number
    scale: number
    moved: boolean
  } | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [dragging, setDragging] = useState(false)
  const t = result.title
  const box = t.box
  const visible = t.status !== "empty" && box.w > 0

  const padX = Math.max(14, t.size * 0.08)
  const padTop = Math.max(14, t.size * 0.16)
  const padBottom = Math.max(14, t.size * 0.3)
  const chipBelow = box.y - padTop < 130

  const finish = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    setDragging(false)
    setGuides([])
    onGuides?.(null)
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    const surface = e.currentTarget.parentElement
    if (!surface) return
    e.preventDefault()
    e.currentTarget.focus({ preventScroll: true })
    e.currentTarget.setPointerCapture(e.pointerId)
    onSelect(true)
    const scale = SIZE / surface.getBoundingClientRect().width
    drag.current = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      x0: box.x,
      y0: box.y,
      scale,
      moved: false,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 3) return
      d.moved = true
      setDragging(true)
    }
    const moved = {
      x: d.x0 + dx * d.scale,
      y: d.y0 + dy * d.scale,
      w: box.w,
      h: box.h,
    }
    // Alt/Option drags freely without snapping.
    const snapped = snapBox(moved, e.altKey ? 0 : 10 * d.scale)
    setGuides(snapped.guides)
    onGuides?.(snapped.guides)
    onMove(anchorFor(t, snapped.x, snapped.y))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      if (selected) {
        e.preventDefault()
        e.stopPropagation()
        onSelect(false)
      }
      return
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onSelect(!selected)
      return
    }
    const step = e.shiftKey ? 40 : 8
    const delta =
      e.key === "ArrowLeft"
        ? [-step, 0]
        : e.key === "ArrowRight"
          ? [step, 0]
          : e.key === "ArrowUp"
            ? [0, -step]
            : e.key === "ArrowDown"
              ? [0, step]
              : null
    if (!delta) return
    e.preventDefault()
    onSelect(true)
    const x = clamp(box.x + delta[0], SAFE, Math.max(SAFE, RIGHT - box.w))
    const y = clamp(box.y + delta[1], SAFE, Math.max(SAFE, BOTTOM - box.h))
    onMove(anchorFor(t, x, y))
  }

  const titleText = t.lines.join(" ").trim()

  return (
    <div
      ref={stageRef}
      className="relative aspect-square w-full select-none"
      onPointerDown={(e) => {
        if (
          !(e.target instanceof Element) ||
          !e.target.closest("[data-title-handle]")
        )
          onSelect(false)
      }}
    >
      <div className="cover-shadow absolute inset-0 overflow-hidden rounded-[2px]">
        <CoverArt
          scene={result.scene}
          label={label}
          className="block size-full"
        />
      </div>

      {dragging && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute border border-dashed border-accent/70 shadow-[0_0_0_1px_rgb(255_255_255/0.35)]"
          style={{ inset: pct(SAFE) }}
        />
      )}
      {guides.map((g) =>
        g.axis === "x" ? (
          <span
            key={`x${g.at}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-accent shadow-[0_0_0_1px_rgb(255_255_255/0.7)]"
            style={{ left: pct(g.at) }}
          />
        ) : (
          <span
            key={`y${g.at}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 h-px -translate-y-1/2 bg-accent shadow-[0_0_0_1px_rgb(255_255_255/0.7)]"
            style={{ top: pct(g.at) }}
          />
        ),
      )}

      {visible && (
        <button
          type="button"
          data-title-handle=""
          aria-label={`Title: ${titleText}. Drag, or use the arrow keys, to move it.`}
          aria-describedby={helpId}
          aria-pressed={selected}
          className={cn(
            "group absolute touch-none rounded-[2px] outline-none",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{
            left: pct(box.x - padX),
            top: pct(box.y - padTop),
            width: pct(box.w + 2 * padX),
            height: pct(box.h + padTop + padBottom),
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onLostPointerCapture={finish}
          onKeyDown={onKeyDown}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[2px] transition-opacity duration-150",
              selected
                ? "opacity-100 ring-[1.5px] ring-accent shadow-[0_0_0_3px_rgb(255_255_255/0.55)]"
                : "opacity-0 ring-1 ring-accent/80 group-focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100",
            )}
          />
          {selected && (
            <>
              {[
                "-left-[4px] -top-[4px]",
                "-right-[4px] -top-[4px]",
                "-left-[4px] -bottom-[4px]",
                "-right-[4px] -bottom-[4px]",
              ].map((pos) => (
                <span
                  key={pos}
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute size-[7px] rounded-[1px] border-[1.5px] border-accent bg-white",
                    pos,
                  )}
                />
              ))}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute -left-[1px] rounded-[3px] bg-accent px-1.5 py-[4px] font-mono text-[11px] leading-none whitespace-nowrap text-white",
                  chipBelow ? "top-full mt-1.5" : "bottom-full mb-1.5",
                )}
              >
                Title · {t.size}px
              </span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
