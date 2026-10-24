import { ArrowRight, RotateCcw } from "lucide-react"
import { useMemo, useRef } from "react"
import { CoverArt } from "../cover/CoverArt"
import { TEMPLATES, TEMPLATE_BY_ID, type TemplateDef } from "../cover/templates"
import type { TemplateId } from "../cover/types"
import { useCover } from "../cover/useCover"
import { cn } from "../lib/cn"
import { captureFlip } from "../lib/flip"
import {
  createDraft,
  switchTemplate,
  toCoverInput,
  type Draft,
} from "../state/draft"
import { Button } from "../ui/Button"
import { Wordmark } from "../ui/Wordmark"

function TemplateCard({
  template,
  draft,
  index,
  onPick,
}: {
  template: TemplateDef
  draft: Draft | null
  index: number
  onPick(id: TemplateId, el: Element | null): void
}) {
  const art = useRef<HTMLSpanElement>(null)
  const input = useMemo(
    () =>
      toCoverInput(
        draft ? switchTemplate(draft, template.id) : createDraft(template.id),
      ),
    [draft, template.id],
  )
  const { scene } = useCover(input)
  const current = draft?.templateId === template.id
  if (template.id === "window") {
    return (
      <li className="col-span-2 mt-2 border-y border-ink/70 py-6 sm:col-span-3 lg:py-8">
        <button
          type="button"
          onClick={() => onPick(template.id, art.current)}
          aria-label={`${template.name}. ${template.blurb}${
            current ? " Currently editing." : ""
          }`}
          className="press catalog-item group grid w-full items-center gap-6 text-left sm:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-14"
        >
          <span
            ref={art}
            className="catalog-cover block w-full max-w-[320px] overflow-hidden"
          >
            <CoverArt scene={scene} className="block aspect-square w-full" />
          </span>
          <span className="block py-3">
            <span className="font-mono text-[11px] tracking-[0.06em] text-muted">
              EDITION 07 — A WINDOW OF YOUR OWN
            </span>
            <span className="mt-4 block text-[34px] leading-[1.02] font-medium tracking-[-0.045em] lg:text-[48px]">
              Your photo.
              <br />A different sleeve.
            </span>
            <span className="mt-4 block max-w-[360px] text-[14px] leading-relaxed text-muted">
              A considered frame for something personal. Add a photo, find the
              crop, and let the type do the rest.
            </span>
            <span className="mt-6 inline-flex items-center gap-3 border-b border-accent pb-1 text-[13px] font-medium text-accent">
              Open photo editor <ArrowRight size={15} aria-hidden="true" />
            </span>
          </span>
        </button>
      </li>
    )
  }
  return (
    <li className="animate-enter" style={{ animationDelay: `${index * 40}ms` }}>
      <button
        type="button"
        onClick={() => onPick(template.id, art.current)}
        aria-label={`${template.name}. ${template.blurb}${
          current ? " Currently editing." : ""
        }`}
        className="press catalog-item group block w-full text-left"
      >
        <span aria-hidden="true" className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-[0.08em] text-muted">
          <span>SLV—{template.no} / GRAPHIC</span>
          <span className="text-accent">↗</span>
        </span>
        <span
          ref={art}
          className={cn(
            "catalog-cover block overflow-hidden",
            current && "ring-1 ring-accent ring-offset-2 ring-offset-paper",
          )}
        >
          <CoverArt scene={scene} className="block aspect-square w-full" />
        </span>
        <span className="mt-3 flex items-baseline gap-2 border-b border-line pb-2">
          <span className="font-mono text-[12px] text-muted">
            {template.no}
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.01em]">
            {template.name}
          </span>
          {current && (
            <span className="ml-auto bg-accent px-2 py-0.5 font-mono text-[9px] text-paper uppercase">
              Editing
            </span>
          )}
        </span>
        <span className="mt-2 block text-[12px] leading-[1.45] text-muted">
          {template.blurb}
        </span>
      </button>
    </li>
  )
}

interface TemplatesViewProps {
  draft: Draft | null
  onPick(id: TemplateId): void
  onContinue(): void
  onStartOver(): void
}

export function TemplatesView({
  draft,
  onPick,
  onContinue,
  onStartOver,
}: TemplatesViewProps) {
  return (
    <div className="press-room min-h-dvh px-5 lg:px-10">
      <header className="catalog-masthead mx-auto flex h-[78px] max-w-[1160px] items-center justify-between">
        <Wordmark size={29} />
        <div className="flex items-center gap-6">
          <span className="hidden font-mono text-[10px] leading-4 tracking-[0.06em] text-muted sm:block">
            INDEPENDENT COVER PRESS<br />A LITTLE SOUND, IN PRINT.
          </span>
          <span className="press-calibration" aria-hidden="true"><i /><i /><i /><i /></span>
        </div>
      </header>
      <main className="mx-auto max-w-[1160px] pb-16">
        <div className="catalog-hero">
          <div>
            <p className="mb-5 flex items-center gap-3 font-mono text-[10px] tracking-[0.05em] text-muted">
              <span className="h-px w-8 bg-accent" aria-hidden="true" />
              THE SLEEVE COLLECTION / SERIES 001
            </p>
            <h1 className="catalog-title">
              Sound,
              <br />
              <span className="text-accent">in print.</span>
            </h1>
            <p className="mt-6 max-w-[380px] text-[14px] leading-[1.6] text-muted">
              A small cover studio for your next mix. Choose a sleeve,
              find your words, and put your own spin on it.
            </p>
          </div>
          <div className="catalog-stock-card" aria-label="Seven editions, square 1080 by 1080 PNG">
            <p className="font-mono text-[9px] tracking-[0.08em] text-muted">SLEEVE / PRESS NOTES</p>
            <div className="mt-5 flex items-end justify-between border-b border-ink pb-3">
              <span className="text-[66px] leading-none font-medium tracking-[-0.075em]">07</span>
              <span className="mb-1 font-mono text-[10px] text-accent">EDITIONS</span>
            </div>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 font-mono text-[9px] leading-4 text-muted">
              <dt>GRAPHIC / PHOTO</dt><dd className="text-ink">06 / 01</dd>
              <dt>FORMAT</dt><dd className="text-ink">1080 × 1080</dd>
              <dt>FINISH</dt><dd className="text-ink">PNG</dd>
            </dl>
          </div>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-y border-ink/80 py-3">
          <h2 className="font-mono text-[10px] tracking-[0.06em]">CHOOSE YOUR EDITION <span className="ml-3 text-accent">01—07</span></h2>
          {draft && (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={onContinue}>
                Continue {TEMPLATE_BY_ID[draft.templateId].name}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onStartOver}>
                <RotateCcw size={16} aria-hidden="true" />
                Start over
              </Button>
            </div>
          )}
          {!draft && <span className="font-mono text-[9px] tracking-[0.04em] text-muted">YOUR WORDS. YOUR COLORS. YOUR MIX.</span>}
        </div>
        <ul aria-label="Templates" className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:gap-x-7 lg:gap-y-10">
          {TEMPLATES.map((t, i) => (
            <TemplateCard
              key={t.id}
              template={t}
              draft={draft}
              index={i}
              onPick={(id, el) => {
                captureFlip(el)
                onPick(id)
              }}
            />
          ))}
        </ul>
        {draft && (
          <p className="mt-10 text-[13px] text-muted">
            Switching templates keeps your title, subtitle and font.
          </p>
        )}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink pt-4 font-mono text-[9px] tracking-[0.04em] text-muted">
          <span>COMPOSE SOMETHING WORTH KEEPING.</span>
          <span>INDEPENDENT COVER PRESS / SLEEVE. 001</span>
        </footer>
      </main>
    </div>
  )
}
