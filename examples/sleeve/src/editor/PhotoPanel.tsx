import { ImagePlus, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { DEFAULT_CROP, DEMO_PHOTO, readPhotoFile } from '../cover/photo'
import type { PhotoAsset, PhotoCrop } from '../cover/types'
import { useDraftStorageMessage, useDraftStorageStatus } from '../state/draft'

interface PhotoPanelProps {
  photo: PhotoAsset | null
  crop: PhotoCrop
  onChangePhoto(photo: PhotoAsset | null): void
  onChangeCrop(crop: PhotoCrop): void
}

function CropControl({
  id, label, value, min, max, step, display, disabled, onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  disabled: boolean
  onChange(value: number): void
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[12px] font-medium">{label}</label>
        <output htmlFor={id} className="font-mono text-[11px] text-muted tabular-nums">{display}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={display}
        className="range mt-1 w-full disabled:opacity-40"
        style={{ '--p': ((value - min) / (max - min)) * 100 + '%' } as CSSProperties}
      />
    </div>
  )
}

export function PhotoPanel({ photo, crop, onChangePhoto, onChangeCrop }: PhotoPanelProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const generation = useRef(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const storageStatus = useDraftStorageStatus()
  const storageMessage = useDraftStorageMessage()
  const current = photo ?? DEMO_PHOTO
  const canReset = crop.x !== 50 || crop.y !== 50 || crop.zoom !== 1

  useEffect(() => () => { generation.current += 1 }, [])

  const upload = async (file: File) => {
    const ticket = ++generation.current
    setBusy(true)
    setError(null)
    try {
      const asset = await readPhotoFile(file)
      if (ticket !== generation.current) return
      onChangePhoto(asset)
      onChangeCrop({ ...DEFAULT_CROP })
    } catch (err) {
      if (ticket === generation.current) {
        setError(err instanceof Error ? err.message : 'This image could not be opened. Please try another file.')
      }
    } finally {
      if (ticket === generation.current) setBusy(false)
    }
  }

  const remove = () => {
    generation.current += 1
    setBusy(false)
    setError(null)
    onChangePhoto(null)
    onChangeCrop({ ...DEFAULT_CROP })
  }

  return (
    <div className="space-y-4" aria-busy={busy}>
      <div>
        <div className="flex items-center gap-3 border border-line bg-field p-2.5">
          <img
            src={current.src}
            width={80}
            height={64}
            alt={photo ? 'Your uploaded photo' : 'AI-generated architectural demo'}
            className="h-12 w-16 shrink-0 object-cover"
            onError={() => setError('This photo could not be displayed. Replace it with a new upload.')}
          />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium" title={current.name}>
              {photo ? current.name : 'AI-generated demo'}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted">
              {current.width} × {current.height}
            </p>
            {!photo && <p className="mt-1 text-[11px] leading-[1.4] text-muted">Replace it with your own view.</p>}
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="press print-button flex h-10 min-w-0 flex-1 items-center justify-center gap-2 border border-line bg-field px-3 text-[12px] font-medium hover:border-ink/40 disabled:opacity-50"
          >
            {busy ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <ImagePlus size={15} aria-hidden="true" />}
            {busy ? 'Preparing image…' : photo ? 'Replace photo' : 'Upload your photo'}
          </button>
          {photo && (
            <button
              type="button"
              onClick={remove}
              aria-label="Remove photo and use the demo"
              title="Remove photo"
              className="press print-button grid size-10 shrink-0 place-items-center border border-line bg-field text-muted hover:border-ink/40 hover:text-ink"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        <input
          ref={input}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void upload(file)
          }}
          tabIndex={-1}
          aria-label="Choose a JPEG, PNG or WebP photo"
        />
        <p className="mt-2 text-[11px] leading-[1.45] text-muted">JPEG, PNG or WebP · up to 15 MB</p>
      </div>

      <div className="space-y-1 border-t border-line/70 pt-3">
        <CropControl id={id + '-zoom'} label="Zoom" value={crop.zoom} min={1} max={3} step={0.01}
          display={crop.zoom.toFixed(2) + '×'} disabled={busy}
          onChange={(zoom) => onChangeCrop({ ...crop, zoom })} />
        <CropControl id={id + '-x'} label="Horizontal" value={crop.x} min={0} max={100} step={1}
          display={Math.round(crop.x) + '%'} disabled={busy}
          onChange={(x) => onChangeCrop({ ...crop, x })} />
        <CropControl id={id + '-y'} label="Vertical" value={crop.y} min={0} max={100} step={1}
          display={Math.round(crop.y) + '%'} disabled={busy}
          onChange={(y) => onChangeCrop({ ...crop, y })} />
        <button
          type="button"
          onClick={() => onChangeCrop({ ...DEFAULT_CROP })}
          disabled={!canReset || busy}
          className="press print-button mt-1 flex h-9 w-full items-center justify-center gap-2 border border-line text-[12px] font-medium hover:bg-ink/5 disabled:opacity-40"
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset crop
        </button>
      </div>
      {error && <p role="alert" className="text-[12px] leading-[1.5] text-danger">{error}</p>}
      {storageStatus === 'memory' && (
        <p role="alert" className="text-[12px] leading-[1.5] text-danger">
          {storageMessage ?? 'Changes stay in this page only. Download before reloading.'}
        </p>
      )}
      <p className="text-[11px] leading-[1.5] text-muted">Processed locally. Nothing is uploaded.</p>
    </div>
  )
}
