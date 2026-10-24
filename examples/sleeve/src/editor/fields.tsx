import { CircleAlert, Info } from "lucide-react"
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { applyLimit, countChars } from "../cover/text"
import { cn } from "../lib/cn"

export interface FieldMessage {
  tone: "error" | "info"
  text: string
}

/** Arrow/Home/End movement for a group of role="radio" buttons. */
export function roving(
  e: KeyboardEvent<HTMLElement>,
  index: number,
  count: number,
  select: (i: number) => void,
  columns = 1,
) {
  let next: number
  if (e.key === "ArrowRight") next = index + 1
  else if (e.key === "ArrowLeft") next = index - 1
  else if (e.key === "ArrowDown") next = index + columns
  else if (e.key === "ArrowUp") next = index - columns
  else if (e.key === "Home") next = 0
  else if (e.key === "End") next = count - 1
  else return
  e.preventDefault()
  next = ((next % count) + count) % count
  select(next)
  const radios =
    e.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
      '[role="radio"]',
    )
  radios?.[next]?.focus()
}

interface LimitedFieldProps {
  id: string
  label: string
  value: string
  onChange(value: string): void
  maxChars: number
  maxLines: number
  hint: string
  optional?: boolean
  message?: FieldMessage | null
  invalid?: boolean
}

/**
 * Text input with grapheme-aware limits. Limits are applied after IME composition
 * ends, never mid-composition, and only to the inserted text.
 */
export function LimitedField({
  id,
  label,
  value,
  onChange,
  maxChars,
  maxLines,
  hint,
  optional,
  message,
  invalid,
}: LimitedFieldProps) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const composing = useRef(false)
  const beforeComposition = useRef(value)
  const caret = useRef<number | null>(null)
  const [note, setNote] = useState<"chars" | "lines" | null>(null)
  const multiline = maxLines > 1

  useLayoutEffect(() => {
    const el = ref.current
    if (el && caret.current !== null && document.activeElement === el)
      el.setSelectionRange(caret.current, caret.current)
    caret.current = null
  })

  const commit = (raw: string, prev: string) => {
    const r = applyLimit(prev, raw, maxChars, maxLines)
    caret.current = r.caret
    setNote(r.limited)
    onChange(r.value)
  }

  const onKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229)
      return
    const el = e.currentTarget
    if (!multiline) {
      e.preventDefault()
      el.blur()
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    const rest = el.value.slice(0, start) + el.value.slice(end)
    if (rest.split("\n").length >= maxLines) {
      e.preventDefault()
      setNote("lines")
    }
  }

  const count = countChars(value)
  const noteText =
    note === "chars"
      ? `${label} is limited to ${maxChars} characters.`
      : note === "lines"
        ? `${label} can have up to ${maxLines} lines.`
        : null
  const shown: FieldMessage | null =
    message?.tone === "error"
      ? message
      : noteText
        ? { tone: "info", text: noteText }
        : (message ?? null)

  const shared = {
    id,
    ref,
    value,
    spellCheck: false,
    autoComplete: "off",
    "aria-invalid": invalid || undefined,
    "aria-describedby": `${id}-msg ${id}-count`,
    className: cn(
      "field mt-1.5 leading-5",
      multiline ? "h-[82px] min-h-[82px] resize-none" : "h-11",
    ),
    onCompositionStart: () => {
      composing.current = true
      beforeComposition.current = value
    },
    onCompositionEnd: (e: {
      currentTarget: HTMLTextAreaElement | HTMLInputElement
    }) => {
      composing.current = false
      commit(e.currentTarget.value, beforeComposition.current)
    },
    onChange: (e: {
      target: HTMLTextAreaElement | HTMLInputElement
      nativeEvent: Event
    }) => {
      if (composing.current || (e.nativeEvent as InputEvent).isComposing) {
        onChange(e.target.value)
        return
      }
      commit(e.target.value, value)
    },
    onKeyDown,
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label">
          {label}
          {optional && (
            <span className="ml-1 text-[11px] font-normal text-muted">
              optional
            </span>
          )}
        </label>
        <span
          aria-hidden="true"
          className={cn(
            "shrink-0 font-mono text-[11px] leading-4 tabular-nums",
            count >= maxChars ? "text-ink" : "text-muted",
          )}
        >
          {count}/{maxChars}
        </span>
      </div>
      {multiline ? (
        <textarea {...shared} rows={3} />
      ) : (
        <input {...shared} type="text" enterKeyHint="done" />
      )}
      <p
        id={`${id}-msg`}
        aria-live="polite"
        className={cn(
          "mt-1.5 flex items-start gap-1.5 text-[11px] leading-[1.4]",
          shown?.tone === "error" ? "text-danger" : "text-muted",
          !shown && !hint && "sr-only",
        )}
      >
        {shown?.tone === "error" && (
          <CircleAlert
            size={14}
            className="mt-px shrink-0"
            aria-hidden="true"
          />
        )}
        {shown?.tone === "info" && (
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
        )}
        <span>{shown ? shown.text : hint}</span>
      </p>
      <span id={`${id}-count`} className="sr-only">
        {count} of {maxChars} characters used.
      </span>
    </div>
  )
}
