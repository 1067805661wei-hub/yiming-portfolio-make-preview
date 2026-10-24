import { Check, RotateCcw } from "lucide-react"
import { PALETTES } from "../cover/palettes"
import type { PaletteId } from "../cover/types"
import { cn } from "../lib/cn"
import { roving } from "./fields"

interface PalettePanelProps {
  value: PaletteId
  explicit: boolean
  templateDefault: PaletteId
  templateName: string
  onChange(id: PaletteId | null): void
}

export function PalettePanel({
  value,
  explicit,
  templateDefault,
  templateName,
  onChange,
}: PalettePanelProps) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Palette"
        className="grid max-h-[440px] grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-1"
      >
        {PALETTES.map((p, i) => {
          const on = p.id === value
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${p.name}${
                p.id === templateDefault ? ", template default" : ""
              }`}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(p.id)}
              onKeyDown={(e) =>
                roving(
                  e,
                  i,
                  PALETTES.length,
                  (n) => onChange(PALETTES[n].id),
                  1,
                )
              }
              className={cn(
                "press print-control min-w-0 border px-2.5 py-1.5 text-left",
                on
                  ? "border-accent bg-accent/[0.035]"
                  : "border-line bg-field hover:border-[#b9b5ab]",
              )}
            >
              <span className="mb-1 flex h-3.5 items-center justify-between gap-2">
                <span className="truncate text-[12px] leading-4 font-medium">
                  {p.name}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {p.id === templateDefault && (
                    <span
                      aria-hidden="true"
                      className="font-mono text-[10px] leading-4 text-muted"
                    >
                      default
                    </span>
                  )}
                  {on && (
                    <Check
                      size={14}
                      className="text-accent"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="relative flex h-4 overflow-hidden"
              >
                <span className="flex-[2]" style={{ background: p.bg }} />
                <span className="flex-1" style={{ background: p.primary }} />
                <span className="flex-1" style={{ background: p.secondary }} />
                <span className="pointer-events-none absolute inset-0 ring-1 ring-ink/10 ring-inset" />
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] leading-[1.45] text-muted">
        {explicit
          ? "Applies across all templates."
          : `${templateName}’s original palette. Pick a palette to apply it across templates.`}
      </p>
      {explicit && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="press mt-3 inline-flex min-h-10 items-center gap-1.5 text-left text-[12px] font-medium text-accent underline-offset-2 hover:underline"
        >
          <RotateCcw size={13} aria-hidden="true" />
          Use each template’s default
        </button>
      )}
    </div>
  )
}
