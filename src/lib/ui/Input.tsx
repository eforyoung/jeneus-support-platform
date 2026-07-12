import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="form-group">
        <label htmlFor={inputId} className="block text-sm font-medium text-white/70 mb-1">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white',
            'focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30',
            'placeholder:text-white/30',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="form-group">
        <label htmlFor={inputId} className="block text-sm font-medium text-white/70 mb-1">
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white resize-y',
            'focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30',
            'placeholder:text-white/30',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
