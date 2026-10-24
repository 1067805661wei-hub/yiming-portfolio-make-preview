import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  /** Show only the icon; the label is still announced. */
  iconOnly?: boolean
}

interface SegmentedProps<T extends string> {
  value: T | null
  options: readonly SegmentOption<T>[]
  onChange(value: T): void
  labelledBy: string
}

/** Single-choice radio group with arrow-key movement. */
export function Segmented<T extends string>({ value, options, onChange, labelledBy }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = options.findIndex((o) => o.value === value)

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (index + dir + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="print-segments mt-2 grid auto-cols-fr grid-flow-col gap-1 border border-line bg-field p-1"
    >
      {options.map((o, i) => {
        const on = i === selected
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.iconOnly ? o.label : undefined}
            title={o.iconOnly ? o.label : undefined}
            tabIndex={on || (selected === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'press flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[5px] px-2 text-[13px] font-medium lg:h-9',
              on ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/5',
            )}
          >
            {o.icon}
            {!o.iconOnly && <span className="truncate">{o.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
