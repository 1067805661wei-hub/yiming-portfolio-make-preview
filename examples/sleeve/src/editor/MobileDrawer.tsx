import { X } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"
import type { Tool } from "../app/router"
import { cn } from "../lib/cn"

export const TOOL_LABEL: Record<Tool, string> = {
  photo: "Photo",
  text: "Text",
  layout: "Layout",
  palette: "Palette",
}
const TOOLS: Tool[] = ["text", "layout", "palette"]

interface MobileDrawerProps {
  tool: Tool
  leaving: boolean
  onSwitch(tool: Tool): void
  onClose(): void
  children: ReactNode
  tools?: readonly Tool[]
}

/** Non-modal bottom sheet: the cover above stays visible and draggable. */
export function MobileDrawer({
  tool,
  leaving,
  onSwitch,
  onClose,
  children,
  tools = TOOLS,
}: MobileDrawerProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Focus the sheet itself, never a field, so the keyboard does not pop up uninvited.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  // When the software keyboard shrinks the sheet, keep the focused field in view.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const active = document.activeElement
      if (
        active instanceof HTMLElement &&
        ref.current?.contains(active) &&
        active.matches("input, textarea")
      ) {
        active.scrollIntoView({ block: "nearest" })
      }
    }
    vv.addEventListener("resize", onResize)
    return () => vv.removeEventListener("resize", onResize)
  }, [])

  return (
    <section
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby="drawer-title"
      tabIndex={-1}
      className={cn(
        "relative z-10 flex max-h-[62%] min-h-0 shrink-0 flex-col rounded-t-[14px] border-t border-line bg-paper shadow-[0_-16px_40px_-24px_rgb(29_29_27/0.35)] outline-none",
        leaving ? "animate-sheet-out" : "animate-sheet-in",
      )}
    >
      <h2 id="drawer-title" className="sr-only">
        {TOOL_LABEL[tool]}
      </h2>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line pr-1.5 pl-3">
        <div role="tablist" aria-label="Edit" className="flex gap-1">
          {tools.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`drawer-tab-${t}`}
              aria-controls="drawer-panel"
              aria-selected={t === tool}
              tabIndex={t === tool ? 0 : -1}
              onClick={() => onSwitch(t)}
              onKeyDown={(e) => {
                const delta =
                  e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tools.length - 1
                      : delta
                        ? (i + delta + tools.length) % tools.length
                        : -1
                if (next < 0) return
                e.preventDefault()
                onSwitch(tools[next])
                const tabs =
                  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    '[role="tab"]',
                  )
                tabs?.[next]?.focus()
              }}
              className={cn(
                "press h-9 rounded-[6px] px-3 text-[14px] font-medium",
                t === tool ? "bg-ink text-paper" : "text-ink hover:bg-ink/5",
              )}
            >
              {TOOL_LABEL[t]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${TOOL_LABEL[tool]}`}
          className="press grid size-11 place-items-center rounded-full hover:bg-ink/5"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div
        id="drawer-panel"
        role="tabpanel"
        aria-labelledby={`drawer-tab-${tool}`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-[max(24px,env(safe-area-inset-bottom))]"
      >
        {children}
      </div>
    </section>
  )
}
