import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Card({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('bg-dark-card border border-teal/20 rounded-lg p-5', className)}>
      {title && (
        <h2 className="text-base font-semibold text-white mb-3 pb-2 border-b border-white/10">
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
