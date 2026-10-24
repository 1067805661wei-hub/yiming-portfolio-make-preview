import { Check } from "lucide-react"
import { memo, useDeferredValue, useMemo } from "react"
import { CoverArt } from "../cover/CoverArt"
import { TEMPLATES, type TemplateDef } from "../cover/templates"
import type { TemplateId } from "../cover/types"
import { useCover } from "../cover/useCover"
import { cn } from "../lib/cn"
import { switchTemplate, toCoverInput, type Draft } from "../state/draft"

const TEMPLATE_MOODS: Record<TemplateId, string> = {
  orbit: "After dark",
  typecut: "Type, up front",
  pulse: "High energy",
  patchwork: "Soft & modular",
  diagonal: "In motion",
  index: "Quietly collected",
  window: "Your photo, in print",
}

const RailItem = memo(function RailItem({
  template,
  draft,
  current,
  onSwitch,
}: {
  template: TemplateDef
  draft: Draft
  current: boolean
  onSwitch(id: TemplateId): void
}) {
  const input = useMemo(
    () => toCoverInput(switchTemplate(draft, template.id)),
    [draft, template.id],
  )
  const { scene } = useCover(input)
  return (
    <li>
      <button
        type="button"
        aria-current={current ? "true" : undefined}
        aria-pressed={current}
        aria-label={`${template.no} ${template.name}${
          current ? ", current template" : ""
        }`}
        onClick={() => onSwitch(template.id)}
        className={cn(
          "press group relative flex h-[72px] w-full items-center gap-2.5 border-b border-line/50 px-2.5 py-1.5 text-left",
          current ? "bg-field" : "hover:bg-field/60",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-3 left-0 w-0.5 transition-opacity duration-150",
            current ? "bg-accent opacity-100" : "opacity-0",
          )}
        />
        <span
          className={cn(
            "block size-[54px] shrink-0 overflow-hidden ring-1 shadow-[1px_2px_0_#d5cfc0] transition-shadow duration-150",
            current ? "ring-accent/25" : "ring-ink/10 group-hover:ring-ink/25",
          )}
        >
          <CoverArt scene={scene} className="block aspect-square w-full" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "font-mono text-[10px] leading-none",
                current ? "text-accent" : "text-muted",
              )}
            >
              {template.no}
            </span>
            {current && (
              <Check
                size={12}
                strokeWidth={2}
                className="shrink-0 text-accent"
                aria-hidden="true"
              />
            )}
          </span>
          <span className="text-[12px] leading-4 font-semibold tracking-[0.015em]">
            {template.name}
          </span>
          <span className="truncate text-[10px] leading-3.5 text-muted">
            {TEMPLATE_MOODS[template.id]}
          </span>
        </span>
      </button>
    </li>
  )
})

export function TemplateRail({
  draft,
  onSwitch,
}: {
  draft: Draft
  onSwitch(id: TemplateId): void
}) {
  // Thumbnails lag a frame behind typing so the main preview stays instant.
  const deferred = useDeferredValue(draft)
  return (
    <nav
      aria-label="Templates"
      className="flex min-h-0 flex-col overflow-y-auto border-r border-line"
    >
      <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
        <p className="font-mono text-[10px] leading-4 tracking-[0.09em] text-muted uppercase">
          THE EDITIONS
        </p>
        <span className="font-mono text-[10px] leading-4 text-muted/75">
          {String(TEMPLATES.length).padStart(2, "0")}
        </span>
      </div>
      <ul className="grid shrink-0 gap-1 px-3">
        {TEMPLATES.map((t) => (
          <RailItem
            key={t.id}
            template={t}
            draft={deferred}
            current={draft.templateId === t.id}
            onSwitch={onSwitch}
          />
        ))}
      </ul>
      <div className="mt-auto flex shrink-0 items-center justify-between px-5 pt-5 pb-4 font-mono text-[9px] leading-3 tracking-[0.08em] text-muted/70">
        <span>INDEPENDENT PRESS</span>
        <span>001</span>
      </div>
    </nav>
  )
}
