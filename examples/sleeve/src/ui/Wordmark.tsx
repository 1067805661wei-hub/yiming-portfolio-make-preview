import { cn } from '../lib/cn'

/** sleeve. — two squares (sleeve and record) and a lowercase wordmark. */
export function Wordmark({ className, size = 20 }: { className?: string; size?: number }) {
  const mark = Math.round(size * 1.05)
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <svg width={mark} height={mark} viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
        <rect x="7.75" y="0.75" width="13.5" height="13.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="0" y="8" width="14" height="14" fill="var(--color-accent)" />
      </svg>
      <span className="leading-none font-semibold tracking-[-0.035em]" style={{ fontSize: size }}>
        sleeve<span className="text-accent">.</span>
      </span>
    </span>
  )
}
