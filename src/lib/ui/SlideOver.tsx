'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export function SlideOver({
  title,
  open,
  onClose,
  children,
  size = 'md',
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 bg-dark-card border-l border-white/10 shadow-2xl transform transition-transform duration-300 w-full',
          widths[size],
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 70px)' }}>
          {children}
        </div>
      </div>
    </>
  )
}
