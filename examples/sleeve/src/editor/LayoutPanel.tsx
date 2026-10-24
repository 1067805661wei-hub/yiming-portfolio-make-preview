import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ChevronDown,
  Keyboard,
  Minus,
  Plus,
  RotateCcw,
  Shrink,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
} from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import type { TemplateDef } from "../cover/templates"
import type { Align, CoverResult } from "../cover/types"
import { cn } from "../lib/cn"
import { Button } from "../ui/Button"
import { Segmented, type SegmentOption } from "../ui/Segmented"

export type Placement = "top" | "middle" | "bottom"

const PLACES: SegmentOption<Placement>[] = [
  {
    value: "top",
    label: "Top",
    icon: <AlignVerticalJustifyStart size={16} aria-hidden="true" />,
  },
  {
    value: "middle",
    label: "Middle",
    icon: <AlignVerticalJustifyCenter size={16} aria-hidden="true" />,
  },
  {
    value: "bottom",
    label: "Bottom",
    icon: <AlignVerticalJustifyEnd size={16} aria-hidden="true" />,
  },
]

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick(): void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press grid size-10 shrink-0 place-items-center rounded-[7px] border border-line bg-field text-ink hover:border-[#b9b5ab] hover:bg-ink/[0.025] disabled:opacity-35 lg:size-9"
    >
      {children}
    </button>
  )
}

interface LayoutPanelProps {
  result: CoverResult
  template: TemplateDef
  canReset: boolean
  onSize(size: number): void
  onAlign(align: Align): void
  onPlace(place: Placement): void
  onReset(): void
}

export function LayoutPanel({
  result,
  template,
  canReset,
  onSize,
  onAlign,
  onPlace,
  onReset,
}: LayoutPanelProps) {
  const t = result.title
  const { min, max } = template.title
  const value = t.requested
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="field-size" className="label">
            Title size
          </label>
          <output
            htmlFor="field-size"
            className="rounded-[5px] bg-ink/[0.045] px-2 py-1 font-mono text-[11px] leading-4 tabular-nums"
          >
            {value} px
          </output>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <StepButton
            label="Smaller title"
            disabled={value <= min}
            onClick={() => onSize(value - 4)}
          >
            <Minus size={16} aria-hidden="true" />
          </StepButton>
          <input
            id="field-size"
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onSize(Number(e.target.value))}
            aria-valuetext={`${value} pixels`}
            aria-describedby="size-note"
            className="range min-w-0 flex-1"
            style={{ "--p": `${pct}%` } as CSSProperties}
          />
          <StepButton
            label="Larger title"
            disabled={value >= max}
            onClick={() => onSize(value + 4)}
          >
            <Plus size={16} aria-hidden="true" />
          </StepButton>
        </div>
        <p
          id="size-note"
          className={cn(
            "mt-2 flex items-start gap-1.5 text-[11px] leading-[1.4]",
            t.status === "overflow" ? "text-danger" : "text-muted",
          )}
        >
          {t.fitted && (
            <Shrink size={14} className="mt-px shrink-0" aria-hidden="true" />
          )}
          <span>
            {t.fitted
              ? `Shrunk to ${t.size} px to fit.`
              : t.status === "overflow"
                ? `Even the smallest size (${t.size} px) does not fit.`
                : `${min}–${max} px · ${template.name}`}
          </span>
        </p>
      </div>

      <div>
        <p id="align-label" className="label">
          Alignment
        </p>
        <Segmented
          labelledBy="align-label"
          value={t.align}
          onChange={onAlign}
          options={[
            {
              value: "left",
              label: "Left",
              icon: <TextAlignStart size={16} aria-hidden="true" />,
            },
            {
              value: "center",
              label: "Center",
              icon: <TextAlignCenter size={16} aria-hidden="true" />,
            },
            {
              value: "right",
              label: "Right",
              icon: <TextAlignEnd size={16} aria-hidden="true" />,
            },
          ]}
        />
      </div>

      <div>
        <p id="place-label" className="label">
          Position
        </p>
        <div
          role="group"
          aria-labelledby="place-label"
          className="mt-2 grid grid-cols-3 gap-1 rounded-[8px] border border-line bg-field p-1"
        >
          {PLACES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPlace(p.value)}
              aria-label={`Move title to the ${p.label.toLowerCase()}`}
              className="press flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[5px] text-[12px] font-medium hover:bg-ink/5 lg:h-9"
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-line/70 pt-4">
        <Button className="w-full" onClick={onReset} disabled={!canReset}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset position
        </Button>
        <details className="group rounded-[8px] border border-line/80 bg-field/50">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-[12px] font-medium [&::-webkit-details-marker]:hidden">
            <Keyboard size={14} className="text-muted" aria-hidden="true" />
            <span className="flex-1">Move & keyboard shortcuts</span>
            <ChevronDown
              size={14}
              className="text-muted transition-transform duration-150 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-line/70 px-3 pt-2.5 pb-3">
            <p className="text-[11px] leading-[1.5] text-muted">
              Drag the title on the cover, or select it to use the keyboard.
            </p>
            <dl className="mt-3 space-y-2 text-[11px] leading-4">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-mono">Arrow keys</dt>
                <dd className="text-muted">Move 8 px</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-mono">Shift + arrows</dt>
                <dd className="text-muted">Move 40 px</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-mono">Alt + drag</dt>
                <dd className="text-muted">Skip snapping</dd>
              </div>
            </dl>
          </div>
        </details>
      </div>
    </div>
  )
}
