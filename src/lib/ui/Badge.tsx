import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const variantClasses = {
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  grey: 'bg-white/10 text-white/60 border-white/20',
}

export function Badge({
  variant = 'grey',
  children,
  className,
}: {
  variant?: keyof typeof variantClasses
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
