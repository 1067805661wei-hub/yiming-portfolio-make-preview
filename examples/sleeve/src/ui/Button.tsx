import type { ComponentProps, MouseEvent } from 'react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
  /** Looks and announces as unavailable but stays focusable; clicks go to `onBlockedClick`. */
  blocked?: boolean
  onBlockedClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'border border-line bg-field text-ink hover:border-[#b9b5ab]',
  ghost: 'text-ink hover:bg-ink/5',
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 gap-1.5 px-3 text-[14px]',
  md: 'h-11 gap-2 px-4 text-[15px] lg:h-10 lg:text-[14px]',
  lg: 'h-12 gap-2 px-5 text-[15px]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  blocked = false,
  onBlockedClick,
  onClick,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-disabled={blocked || undefined}
      onClick={(e) => {
        if (blocked) {
          e.preventDefault()
          onBlockedClick?.(e)
          return
        }
        onClick?.(e)
      }}
      className={cn(
        'press print-button inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap select-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        blocked && 'opacity-45 hover:bg-[inherit]',
        blocked && variant === 'primary' && 'hover:bg-accent',
        className,
      )}
      {...rest}
    />
  )
}
