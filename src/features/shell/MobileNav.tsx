'use client'

import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3, FileText, Ticket,
  MoreHorizontal, Users, Server, FolderKanban, Shield,
} from 'lucide-react'
import { useState } from 'react'

const mobileItems = [
  { label: 'Dashboard', icon: BarChart3, href: '/dashboard/dashboards' },
  { label: 'Invoices', icon: FileText, href: '/dashboard/invoices' },
  { label: 'Tickets', icon: Ticket, href: '/dashboard/tickets' },
  { label: 'Assets', icon: Server, href: '/dashboard/assets' },
]

const moreItems = [
  { label: 'Customers', icon: Users, href: '/dashboard/customers' },
  { label: 'Projects', icon: FolderKanban, href: '/dashboard/projects' },
  { label: 'Users', icon: Shield, href: '/dashboard/users' },
]

export function MobileNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-navy-dark border-t border-white/10 h-16 flex items-center justify-around px-2">
        {mobileItems.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-xs transition-colors min-h-[44px] justify-center',
                active ? 'text-teal' : 'text-white/40 hover:text-white/70'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-xs text-white/40 hover:text-white/70 min-h-[44px]"
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {showMore && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-16 left-4 right-4 bg-dark-card border border-white/10 rounded-xl z-50 sm:hidden p-4 grid grid-cols-3 gap-3">
            {moreItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 min-h-[44px] justify-center"
                >
                  <Icon size={22} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
