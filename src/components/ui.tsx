import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-95 active:brightness-90 font-semibold',
  secondary: 'bg-surface border border-line text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2',
  danger: 'bg-bad-soft text-bad border border-bad/30 hover:brightness-95',
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 h-10 text-[15px] leading-none transition-[background-color,filter] disabled:opacity-50 disabled:pointer-events-none select-none'

export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${variantClass[variant]} ${className}`} {...rest} />
}

export function LinkButton({
  to,
  variant = 'secondary',
  className = '',
  children,
}: {
  to: string
  variant?: Variant
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={`${base} ${variantClass[variant]} ${className}`}>
      {children}
    </Link>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block rounded border border-line bg-surface px-1.5 text-[12px] leading-5 text-ink-2 align-middle">
      {children}
    </kbd>
  )
}

export function Pill({
  tone = 'neutral',
  children,
  title,
}: {
  tone?: 'neutral' | 'ok' | 'bad' | 'accent' | 'vote'
  children: ReactNode
  title?: string
}) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2',
    ok: 'bg-ok-soft text-ok',
    bad: 'bg-bad-soft text-bad',
    accent: 'bg-accent-soft text-flag',
    vote: 'bg-vote-soft text-vote',
  }
  return (
    <span title={title} className={`inline-flex items-center rounded-md px-2 h-6 text-[13px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Letters({ letters, tone = 'neutral' }: { letters: string; tone?: 'ok' | 'vote' | 'neutral' }) {
  const tones = {
    ok: 'bg-ok text-white',
    vote: 'bg-vote text-white',
    neutral: 'bg-surface-2 text-ink',
  }
  return (
    <span className="inline-flex gap-1">
      {letters.split('').map((l) => (
        <span key={l} className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[15px] font-bold ${tones[tone]}`}>
          {l}
        </span>
      ))}
    </span>
  )
}
