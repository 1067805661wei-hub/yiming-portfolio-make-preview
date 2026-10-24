import {
  ArrowLeft,
  Download,
  LoaderCircle,
  Plus,
  RotateCw,
  Share,
} from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { Nav } from "../app/router"
import { loadRuns } from "../cover/fonts"
import { PALETTE_BY_ID } from "../cover/palettes"
import { buildCover } from "../cover/scene"
import { clearMeasureCache } from "../cover/text"
import { fileNameFor, formatBytes, renderPng } from "../cover/render"
import { TEMPLATE_BY_ID } from "../cover/templates"
import { inputKey, runsFor, useCover } from "../cover/useCover"
import { playFlip } from "../lib/flip"
import { toCoverInput, type Draft } from "../state/draft"
import { Button } from "../ui/Button"
import { CoverArt } from "../cover/CoverArt"

type Png = { status: "rendering" } | {
  status: "ready"
  url: string
  file: File
} | { status: "error", message: string }

export function ResultView({
  draft,
  nav,
  onNew,
}: {
  draft: Draft
  nav: Nav
  onNew(): void
}) {
  const input = toCoverInput(draft)
  const { scene, title } = useCover(input)
  const exportKey = inputKey(input)
  const [png, setPng] = useState<Png>({ status: "rendering" })
  const [attempt, setAttempt] = useState(0)
  const [shareNote, setShareNote] = useState("")
  const frame = useRef<HTMLDivElement>(null)
  const name = fileNameFor(draft.title)
  const template = TEMPLATE_BY_ID[draft.templateId]

  useLayoutEffect(() => playFlip(frame.current), [])

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    let fontTimer: number | undefined
    setPng({ status: "rendering" })
    const prepare = async () => {
      try {
        await Promise.race([
          loadRuns(runsFor(input)),
          new Promise<never>((_, reject) => {
            fontTimer = window.setTimeout(() => reject(new Error("Font loading timed out. Please retry.")), 20000)
          }),
        ])
      } catch {
        throw new Error("A required font could not be loaded. Please retry before downloading.")
      } finally {
        window.clearTimeout(fontTimer)
      }
      if (cancelled) return
      // Re-measure after loading, rather than exporting a scene measured using fallback fonts.
      clearMeasureCache()
      const resolved = buildCover(input)
      if (resolved.title.status !== "ok") {
        throw new Error(resolved.title.message ?? "Please add a title that fits before exporting.")
      }
      const blob = await renderPng(resolved.scene, () => cancelled)
      if (cancelled) return
      url = URL.createObjectURL(blob)
      setPng({
        status: "ready",
        url,
        file: new File([blob], name, { type: "image/png" }),
      })
    }
    void prepare().catch((err: unknown) => {
      if (!cancelled)
        setPng({
          status: "error",
          message:
            err instanceof Error ? err.message : "Something went wrong.",
        })
    })
    return () => {
      cancelled = true
      window.clearTimeout(fontTimer)
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exportKey captures the input by value
  }, [exportKey, attempt])

  const canShare =
    png.status === "ready" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [png.file] })

  const share = async () => {
    if (png.status !== "ready") return
    try {
      await navigator.share({
        files: [png.file],
        title: draft.title.replace(/\n/g, " "),
      })
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        setShareNote("Sharing failed. Use Download instead.")
    }
  }

  const alt = `${template.name} cover in ${PALETTE_BY_ID[input.paletteId].name}, titled ${title.lines.join(" ")}`

  return (
    <div className="press-room flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-[1080px] shrink-0 items-center justify-between px-2 lg:h-16 lg:px-6">
        <button
          type="button"
          onClick={() => nav.back("editor")}
          className="press flex h-11 items-center gap-1.5 rounded-[6px] px-3 text-[14px] font-medium hover:bg-ink/5"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Keep editing
        </button>
        <Button variant="ghost" size="sm" onClick={onNew}>
          <Plus size={16} aria-hidden="true" />
          New cover
        </Button>
      </header>
      <main className="mx-auto grid w-full max-w-[1080px] flex-1 content-start gap-8 px-5 pt-4 pb-16 lg:grid-cols-[minmax(0,560px)_1fr] lg:items-center lg:gap-14 lg:px-6 lg:pt-10">
        <div
          ref={frame}
          className="cover-shadow relative aspect-square w-full overflow-hidden rounded-[2px]"
        >
          {png.status === "ready" ? (
            <img
              src={png.url}
              alt={alt}
              width={1080}
              height={1080}
              className="block size-full"
            />
          ) : (
            <CoverArt scene={scene} className="block size-full" />
          )}
        </div>
        <div className="animate-enter">
          <p className="mb-4 font-mono text-[10px] tracking-[0.08em] text-accent">FRESH OFF THE PRESS / SLV—{template.no}</p>
          <h1 className="text-[36px] leading-[1] font-semibold tracking-[-0.04em] lg:text-[52px]">
            {png.status === "error" ? "Export failed." : png.status === "ready" ? "Your cover is ready." : "Preparing your cover."}
          </h1>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 font-mono text-[13px]">
            <dt className="text-muted">File</dt>
            <dd className="truncate">{name}</dd>
            <dt className="text-muted">Size</dt>
            <dd>1080 × 1080 px</dd>
            <dt className="text-muted">Weight</dt>
            <dd aria-live="polite">
              {png.status === "ready"
                ? formatBytes(png.file.size)
                : png.status === "rendering"
                  ? "Rendering…"
                  : "—"}
            </dd>
          </dl>

          {png.status === "error" ? (
            <div role="alert" className="mt-6">
              <p className="text-[14px] leading-[1.5] text-danger">
                {png.message}
              </p>
              <Button className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
                <RotateCw size={16} aria-hidden="true" />
                Try again
              </Button>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-2">
              {png.status === "ready" ? (
                <a
                  href={png.url}
                  download={name}
                  className="press print-button inline-flex h-12 items-center gap-2 bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-strong"
                >
                  <Download size={18} aria-hidden="true" />
                  Download PNG
                </a>
              ) : (
                <Button variant="primary" size="lg" disabled>
                  <LoaderCircle
                    size={18}
                    className="animate-[spin_0.9s_linear_infinite]"
                    aria-hidden="true"
                  />
                  Preparing PNG
                </Button>
              )}
              {canShare && (
                <Button size="lg" onClick={share}>
                  <Share size={18} aria-hidden="true" />
                  Share
                </Button>
              )}
            </div>
          )}
          <p
            role="status"
            className="mt-3 text-[13px] text-danger empty:hidden"
          >
            {shareNote}
          </p>
          <p className="mt-6 max-w-[380px] text-[13px] leading-[1.5] text-muted">
            The PNG is drawn in your browser from the same layout you edited.
            Nothing is uploaded.
          </p>
          {draft.templateId === "window" && !draft.photo && (
            <p className="mt-2 max-w-[380px] text-[12px] leading-[1.5] text-muted">
              This cover uses an AI-generated demo image.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
