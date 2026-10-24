import { Check } from "lucide-react"
import { FONTS, FONT_IDS } from "../cover/fonts"
import {
  SUBTITLE_MAX_CHARS,
  TITLE_MAX_CHARS,
  TITLE_MAX_LINES,
} from "../cover/text"
import type { CoverResult, FontId } from "../cover/types"
import { cn } from "../lib/cn"
import type { Draft } from "../state/draft"
import { Segmented } from "../ui/Segmented"
import { LimitedField, roving } from "./fields"

export const TITLE_FIELD_ID = "field-title"

interface TextPanelProps {
  draft: Draft
  result: CoverResult
  onTitle(value: string): void
  onSubtitle(value: string): void
  onFont(font: FontId): void
  onWeight(weight: number): void
}

export function TextPanel({
  draft,
  result,
  onTitle,
  onSubtitle,
  onFont,
  onWeight,
}: TextPanelProps) {
  const t = result.title
  const font = FONTS[draft.font]
  const fontIndex = FONT_IDS.indexOf(draft.font)
  return (
    <div className="space-y-5">
      <LimitedField
        id={TITLE_FIELD_ID}
        label="Title"
        value={draft.title}
        onChange={onTitle}
        maxChars={TITLE_MAX_CHARS}
        maxLines={TITLE_MAX_LINES}
        hint="Up to 3 lines. Enter for a line break."
        message={
          t.status !== "ok" && t.message
            ? { tone: "error", text: t.message }
            : null
        }
        invalid={t.status !== "ok"}
      />
      <LimitedField
        id="field-subtitle"
        label="Subtitle"
        optional
        value={draft.subtitle}
        onChange={onSubtitle}
        maxChars={SUBTITLE_MAX_CHARS}
        maxLines={1}
        hint=""
      />
      <div>
        <p id="font-label" className="label">
          Title font
        </p>
        <div
          role="radiogroup"
          aria-labelledby="font-label"
          className="mt-2 grid grid-cols-2 gap-2"
        >
          {FONT_IDS.map((id, i) => {
            const f = FONTS[id]
            const on = id === draft.font
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on || fontIndex === -1 ? 0 : -1}
                onClick={() => onFont(id)}
                onKeyDown={(e) =>
                  roving(e, i, FONT_IDS.length, (n) => onFont(FONT_IDS[n]))
                }
                className={cn(
                  "press print-control relative flex h-[64px] min-w-0 flex-col justify-between border px-3 py-2 text-left",
                  on
                    ? "border-accent bg-accent/[0.035]"
                    : "border-line bg-field hover:border-[#b9b5ab]",
                )}
              >
                <span
                  aria-hidden="true"
                  className="text-[23px] leading-none tracking-[-0.04em]"
                  style={{
                    fontFamily: f.family,
                    fontWeight: f.weights[1].value,
                  }}
                >
                  Aa
                </span>
                <span className="truncate pr-1 text-[12px] leading-4 font-medium">
                  {f.name}
                </span>
                {on && (
                  <Check
                    size={14}
                    className="absolute top-2.5 right-2.5 text-accent"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="border-t border-line/70 pt-4">
        <p id="weight-label" className="label">
          Weight
        </p>
        <Segmented
          labelledBy="weight-label"
          value={String(draft.weight)}
          options={font.weights.map((w) => ({
            value: String(w.value),
            label: `${w.label} ${w.value}`,
          }))}
          onChange={(v) => onWeight(Number(v))}
        />
        {draft.font === "mono" && (
          <p className="mt-1.5 text-[11px] leading-[1.4] text-muted">
            Available in Regular and Medium.
          </p>
        )}
      </div>
    </div>
  )
}
