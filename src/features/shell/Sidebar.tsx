'use client'

import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3, FileText, Users, Ticket, Server,
  FolderKanban, Shield, ChevronLeft,
} from 'lucide-react'

type NavItem = {
  label: string
  icon: React.ElementType
  href: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboards', icon: BarChart3, href: '/dashboard/dashboards' },
  { label: 'Invoices', icon: FileText, href: '/dashboard/invoices' },
  { label: 'Customers', icon: Users, href: '/dashboard/customers' },
  { label: 'Tickets', icon: Ticket, href: '/dashboard/tickets' },
  { label: 'Assets', icon: Server, href: '/dashboard/assets' },
  { label: 'Projects', icon: FolderKanban, href: '/dashboard/projects' },
  { label: 'Users', icon: Shield, href: '/dashboard/users', adminOnly: true },
]

export function Sidebar({
  collapsed,
  onToggle,
  userRole,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean
  onToggle: () => void
  userRole: string
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  const pathname = usePathname()

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <div>
            <div className="font-display font-bold text-white text-sm">JENEUS CO. LTD</div>
            <div className="text-white/40 text-xs">Support Platform</div>
          </div>
        )}
        <button onClick={onToggle} className="p-1 hover:bg-white/10 rounded-md hidden lg:block">
          <ChevronLeft size={18} className={cn('transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navItems
          .filter((i) => !i.adminOnly || userRole === 'SUPERADMIN')
          .map((item) => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-teal/10 text-teal border-l-2 border-teal'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:block fixed left-0 top-0 h-full z-30 bg-navy-dark border-r border-white/10 transition-all duration-200',
          collapsed ? 'w-16' : 'w-[260px]'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={onMobileClose} />
          <aside className="lg:hidden fixed left-0 top-0 h-full z-50 w-[260px] bg-navy-dark border-r border-white/10">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
