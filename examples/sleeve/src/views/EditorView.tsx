import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  MousePointer2,
  Move,
  Palette as PaletteIcon,
  Type,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Nav, Tool } from "../app/router"
import { weightFor } from "../cover/fonts"
import { BOTTOM, SAFE, SIZE, clamp } from "../cover/geometry"
import { PALETTE_BY_ID } from "../cover/palettes"
import { TEMPLATE_BY_ID } from "../cover/templates"
import type { Align, Box, TemplateId } from "../cover/types"
import { useCover, useCoverGlyphs } from "../cover/useCover"
import {
  CoverStage,
  anchorFor,
  describeGuides,
  type Guide,
} from "../editor/CoverStage"
import { LayoutPanel, type Placement } from "../editor/LayoutPanel"
import { MobileDrawer, TOOL_LABEL } from "../editor/MobileDrawer"
import { PalettePanel } from "../editor/PalettePanel"
import { PhotoPanel } from "../editor/PhotoPanel"
import { SleeveTransition } from "../editor/SleeveTransition"
import { TemplateRail } from "../editor/TemplateRail"
import { TITLE_FIELD_ID, TextPanel } from "../editor/TextPanel"
import { captureFlip, playFlip } from "../lib/flip"
import { useExitPresence, useIsDesktop, useVisualViewport } from "../lib/hooks"
import {
  isDefaultPosition,
  layoutOf,
  switchTemplate,
  toCoverInput,
  withLayout,
  type Draft,
} from "../state/draft"
import { Button } from "../ui/Button"
import { Wordmark } from "../ui/Wordmark"
import { cn } from "../lib/cn"
import { useDraftStorageStatus } from "../state/draft"

interface EditorViewProps {
  draft: Draft
  setDraft(update: (d: Draft) => Draft): void
  nav: Nav
}

const TOOL_ICON: Record<Tool, ReactNode> = {
  photo: <ImageIcon size={18} aria-hidden="true" />,
  text: <Type size={20} aria-hidden="true" />,
  layout: <Move size={20} aria-hidden="true" />,
  palette: <PaletteIcon size={20} aria-hidden="true" />,
}

const GRAPHIC_TOOLS: readonly Tool[] = ["text", "layout", "palette"]
const PHOTO_TOOLS: readonly Tool[] = ["photo", "text", "layout", "palette"]
const PANEL_TITLE: Record<Tool, string> = {
  photo: "Your photo, in print.",
  text: "Words & type.",
  layout: "Find your balance.",
  palette: "Set the mood.",
}
const PANEL_HINT: Record<Tool, string> = {
  photo: "A personal image. A considered frame.",
  text: "Give your mix a name and a voice.",
  layout: "A little space makes a difference.",
  palette: "Seven covers. Six color stories.",
}

export function EditorView({ draft, setDraft, nav }: EditorViewProps) {
  const desktop = useIsDesktop()
  const viewport = useVisualViewport()
  const input = toCoverInput(draft)
  const result = useCover(input)
  useCoverGlyphs(input)
  const template = TEMPLATE_BY_ID[draft.templateId]
  const t = result.title
  const blocked = t.status !== "ok"
  const photoTemplate = draft.templateId === "window"
  const tools = photoTemplate ? PHOTO_TOOLS : GRAPHIC_TOOLS
  const storageStatus = useDraftStorageStatus()

  const [selected, setSelected] = useState(false)
  const [announce, setAnnounce] = useState("")
  const [activeTool, setActiveTool] = useState<Tool>(
    photoTemplate ? "photo" : "text",
  )
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const lastGuides = useRef<Guide[]>([])
  const stage = useRef<HTMLDivElement>(null)
  const drawer = useExitPresence(desktop ? null : nav.route.drawer, 160)
  const activeDrawer =
    drawer.shown && tools.includes(drawer.shown) ? drawer.shown : null

  useLayoutEffect(() => playFlip(stage.current), [])
  useEffect(() => {
    if (!photoTemplate && activeTool === "photo") setActiveTool("text")
  }, [photoTemplate, activeTool])
  useEffect(() => {
    if (!photoTemplate && nav.route.drawer === "photo") nav.closeDrawer()
  }, [photoTemplate, nav.route.drawer, nav.closeDrawer])

  // ---- edits -------------------------------------------------------------
  const onTitle = (title: string) => setDraft((d) => ({ ...d, title }))
  const onSubtitle = (subtitle: string) => setDraft((d) => ({ ...d, subtitle }))
  const onFont = (font: Draft["font"]) =>
    setDraft((d) => ({
      ...d,
      font,
      weight: weightFor(font, d.weight),
      fontEdited: true,
    }))
  const onWeight = (weight: number) =>
    setDraft((d) => ({ ...d, weight, fontEdited: true }))
  const onSize = (size: number) =>
    setDraft((d) =>
      withLayout(d, {
        size: clamp(Math.round(size), template.title.min, template.title.max),
      }),
    )
  const onMove = useCallback(
    (a: Pick<Box, "x" | "y">) => setDraft((d) => withLayout(d, a)),
    [setDraft],
  )
  const onAlign = (align: Align) =>
    setDraft((d) => {
      // Keep a hand-placed title where it is; only the text inside its block re-aligns.
      if (layoutOf(d).x == null) return withLayout(d, { align })
      return withLayout(d, {
        align,
        x: anchorFor({ ...t, align }, t.box.x, t.box.y).x,
      })
    })
  const onPlace = (place: Placement) => {
    const y =
      place === "top"
        ? SAFE
        : place === "middle"
          ? (SIZE - t.box.h) / 2
          : BOTTOM - t.box.h
    onMove(anchorFor(t, t.box.x, Math.max(SAFE, y)))
    setAnnounce(`Title moved to the ${place}.`)
  }
  const onReset = () => {
    setDraft((d) => withLayout(d, { align: undefined, x: null, y: null }))
    setAnnounce("Title position reset.")
  }
  const onTemplate = (id: TemplateId) => {
    setDraft((d) => switchTemplate(d, id))
    setSelected(false)
    if (id === "window") setActiveTool("photo")
  }

  const onGuides = useCallback((g: Guide[] | null) => {
    if (g) {
      lastGuides.current = g
      return
    }
    setAnnounce(describeGuides(lastGuides.current) ?? "Title moved.")
    lastGuides.current = []
  }, [])

  // ---- export ------------------------------------------------------------
  const exportCover = () => {
    captureFlip(stage.current)
    nav.go("result")
  }
  const onBlocked = () => {
    setAnnounce(t.message ?? "Fix the title before exporting.")
    if (desktop) {
      setActiveTool("text")
      requestAnimationFrame(() =>
        document.getElementById(TITLE_FIELD_ID)?.focus(),
      )
    } else nav.openDrawer("text")
  }
  const exportButton = (
    <Button
      variant="primary"
      size={desktop ? "md" : "sm"}
      blocked={blocked}
      onBlockedClick={onBlocked}
      onClick={exportCover}
      aria-describedby={blocked ? "export-blocked" : undefined}
    >
      <Download size={16} aria-hidden="true" />
      Export
    </Button>
  )

  const palette = PALETTE_BY_ID[input.paletteId]
  const coverLabel = `${template.name} cover, ${palette.name} palette. Title: ${t.lines.join(" ") || "none"}.${
    draft.subtitle ? ` Subtitle: ${draft.subtitle}.` : ""
  }`

  const panels = {
    photo: (
      <PhotoPanel
        photo={draft.photo}
        crop={draft.crop}
        onChangePhoto={(photo) =>
          setDraft((d) => ({ ...d, photo, crop: { x: 50, y: 50, zoom: 1 } }))
        }
        onChangeCrop={(crop) => setDraft((d) => ({ ...d, crop }))}
      />
    ),
    text: (
      <TextPanel
        draft={draft}
        result={result}
        onTitle={onTitle}
        onSubtitle={onSubtitle}
        onFont={onFont}
        onWeight={onWeight}
      />
    ),
    layout: (
      <LayoutPanel
        result={result}
        template={template}
        canReset={!isDefaultPosition(draft)}
        onSize={onSize}
        onAlign={onAlign}
        onPlace={onPlace}
        onReset={onReset}
      />
    ),
    palette: (
      <PalettePanel
        value={input.paletteId}
        explicit={draft.paletteId !== null}
        templateDefault={template.palette}
        templateName={template.name}
        onChange={(paletteId) => setDraft((d) => ({ ...d, paletteId }))}
      />
    ),
  } satisfies Record<Tool, ReactNode>

  const stageEl = (
    <div
      className="grid min-h-0 flex-1 place-items-center p-5 lg:px-8 lg:py-5 xl:px-10"
      style={{ containerType: "size" }}
    >
      <div
        className={desktop ? "studio-cover-frame" : undefined}
        style={{ width: "min(100cqw, 100cqh, 680px)" }}
      >
        <SleeveTransition templateKey={draft.templateId} scene={result.scene}>
          <CoverStage
            result={result}
            label={coverLabel}
            selected={selected}
            onSelect={setSelected}
            onMove={onMove}
            onGuides={onGuides}
            stageRef={stage}
            helpId="stage-help"
          />
        </SleeveTransition>
      </div>
    </div>
  )

  const shared = (
    <>
      <p id="stage-help" className="sr-only">
        Arrow keys move the title 8 pixels, Shift plus arrow 40 pixels. Escape
        deselects.
      </p>
      {blocked && (
        <p id="export-blocked" className="sr-only">
          {t.message ?? "The title needs fixing before export."}
        </p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </>
  )

  const header = (
    <header className="editor-topbar relative z-10 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line bg-paper px-2 lg:h-[72px] lg:grid-cols-[216px_minmax(0,1fr)_320px] lg:gap-0 lg:px-0 xl:grid-cols-[232px_minmax(0,1fr)_336px]">
      <button
        type="button"
        aria-label="All templates"
        onClick={() => nav.back("templates")}
        className="press mr-auto flex h-11 items-center gap-3 rounded-[6px] px-3 text-[14px] font-medium hover:bg-ink/5 lg:ml-3"
      >
        <ArrowLeft size={16} aria-hidden="true" className="text-muted" />
        <span className="hidden lg:inline-flex">
          <Wordmark size={21} />
        </span>
        <span className="lg:hidden" aria-hidden="true">
          Back
        </span>
      </button>
      <h1 className="flex min-w-0 items-center justify-center gap-3 truncate px-2">
        <span className="hidden font-mono text-[10px] tracking-[0.08em] text-muted lg:inline">
          ON THE PRESS
        </span>
        <span className="text-[14px] font-semibold tracking-[-0.025em] lg:text-[16px]">
          {template.name}
        </span>
        <span className="hidden border border-line px-2 py-1 font-mono text-[9px] text-muted lg:inline">
          {template.no} / 07
        </span>
      </h1>
      <div className="flex items-center justify-end gap-4 pr-1.5 lg:pr-5">
        <span className="hidden font-mono text-[10px] text-muted xl:inline">
          1080² / PNG
        </span>
        {exportButton}
      </div>
    </header>
  )

  if (desktop) {
    return (
      <div className="press-room flex h-dvh flex-col">
        {header}
        <div className="grid min-h-0 flex-1 grid-cols-[216px_minmax(0,1fr)_320px] xl:grid-cols-[232px_minmax(0,1fr)_336px]">
          <TemplateRail draft={draft} onSwitch={onTemplate} />
          <main className="studio-surface flex min-h-0 min-w-0 flex-col">
            <div className="flex h-12 shrink-0 items-center justify-between px-7 xl:px-9">
              <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.06em] text-muted">
                <span className="print-status-dot" aria-hidden="true" />
                PRINT PREVIEW
              </span>
              <span className="font-mono text-[10px] text-muted">
                TRIM / SQUARE 1:1
              </span>
            </div>
            {stageEl}
            <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-7 font-mono text-[10px] text-muted xl:px-9">
              <span className="flex items-center gap-2">
                <MousePointer2 size={13} aria-hidden="true" />
                Drag the title to compose
              </span>
              <span className="flex items-center gap-3">
                <span className="press-calibration" aria-hidden="true"><i /><i /><i /><i /></span>
                {photoTemplate ? "PHOTO EDITION" : "GRAPHIC EDITION"}
              </span>
            </div>
          </main>
          <aside
            aria-label="Cover settings"
            className="print-inspector flex min-h-0 flex-col border-l border-line bg-paper"
          >
            <div className="shrink-0 px-5 pt-5 pb-4">
              <p className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-[0.08em] text-muted uppercase">
                <span>TYPE / LAYOUT / INK</span><span className="text-accent">SLV—{template.no}</span>
              </p>
              <h2 className="text-[23px] leading-tight font-medium tracking-[-0.045em]">
                {PANEL_TITLE[activeTool]}
              </h2>
              <p className="mt-1.5 text-[12px] leading-4 text-muted">
                {PANEL_HINT[activeTool]}
              </p>
            </div>
            <div
              role="tablist"
              aria-label="Cover settings"
              className="mx-5 mb-1 grid shrink-0 grid-flow-col auto-cols-fr border-b border-line"
            >
              {tools.map((tool, i) => (
                <button
                  key={tool}
                  ref={(el) => {
                    tabRefs.current[i] = el
                  }}
                  id={`settings-tab-${tool}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTool === tool}
                  aria-controls={`settings-panel-${tool}`}
                  tabIndex={activeTool === tool ? 0 : -1}
                  onClick={() => setActiveTool(tool)}
                  onKeyDown={(e) => {
                    const delta =
                      e.key === "ArrowRight"
                        ? 1
                        : e.key === "ArrowLeft"
                          ? -1
                          : 0
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
                    setActiveTool(tools[next])
                    tabRefs.current[next]?.focus()
                  }}
                  className={cn(
                    "press relative flex h-11 items-center justify-center gap-1.5 text-[12px] font-medium",
                    activeTool === tool
                      ? "text-accent"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {TOOL_LABEL[tool]}
                  {activeTool === tool && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 -bottom-px h-0.5 bg-accent"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-6">
              {tools.map((tool) => (
                <section
                  key={tool}
                  role="tabpanel"
                  id={`settings-panel-${tool}`}
                  aria-labelledby={`settings-tab-${tool}`}
                  hidden={tool !== activeTool}
                  className="inspector-panel"
                >
                  {panels[tool]}
                </section>
              ))}
            </div>
            <div
              className={cn(
                "flex shrink-0 items-center gap-2 border-t border-line px-5 py-3 text-[10px]",
                storageStatus === "memory" ? "text-danger" : "text-muted",
              )}
              role={storageStatus === "memory" ? "status" : undefined}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-1 shrink-0",
                  storageStatus === "memory" ? "bg-danger" : "bg-accent",
                )}
              />
              {storageStatus === "memory"
                ? "Page memory only. Export before refreshing."
                : "Your draft stays in this tab."}
            </div>
          </aside>
        </div>
        {shared}
      </div>
    )
  }

  return (
    <div
      className="press-room fixed inset-x-0 flex flex-col overflow-hidden"
      style={{ top: viewport.offsetTop, height: viewport.height }}
    >
      {header}
      <main className="studio-surface flex min-h-0 flex-1 flex-col">
        {stageEl}
      </main>
      {activeDrawer ? (
        <MobileDrawer
          tool={activeDrawer}
          leaving={drawer.leaving}
          onSwitch={nav.openDrawer}
          onClose={nav.closeDrawer}
          tools={tools}
        >
          {panels[activeDrawer]}
        </MobileDrawer>
      ) : (
        <nav
          aria-label="Edit"
          className={cn(
            "grid shrink-0 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]",
            photoTemplate ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          {tools.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => nav.openDrawer(tool)}
              className="press flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-medium hover:bg-ink/5"
            >
              {TOOL_ICON[tool]}
              {TOOL_LABEL[tool]}
            </button>
          ))}
        </nav>
      )}
      {shared}
    </div>
  )
}
