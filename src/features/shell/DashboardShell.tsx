'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export function DashboardShell({
  userId,
  userName,
  userRole,
  children,
}: {
  userId?: string
  userName: string
  userRole: string
  children: ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-dark">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userRole={userRole}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Header
        userName={userName}
        userRole={userRole}
        onMenuClick={() => setMobileOpen(true)}
      />
      <main className="pt-14 pb-20 sm:pb-0 lg:pl-[260px] transition-all duration-200">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      <MobileNav />
    </div>
  )
}
