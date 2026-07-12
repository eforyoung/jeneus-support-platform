'use client'

import { Menu, Bell, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export function Header({
  userName,
  userRole,
  onMenuClick,
}: {
  userName: string
  userRole: string
  onMenuClick: () => void
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const pathname = usePathname()

  const pageTitle = pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard'
  const formattedTitle = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1)

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[260px] z-20 h-14 bg-dark/70 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-1 hover:bg-white/10 rounded-md">
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-white capitalize">{formattedTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-1.5 hover:bg-white/10 rounded-lg">
          <Bell size={18} className="text-white/60" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-lg"
          >
            <div className="w-7 h-7 bg-teal rounded-full flex items-center justify-center text-xs font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
          </button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-dark-card border border-white/10 rounded-lg shadow-xl z-20 py-1">
                <div className="px-3 py-2 border-b border-white/10">
                  <div className="text-sm font-medium text-white">{userName}</div>
                  <div className="text-xs text-white/40">{userRole}</div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
