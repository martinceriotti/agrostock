'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navItems } from './nav-items'
import { useUser } from '@/lib/hooks/use-user'
import { Leaf } from 'lucide-react'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: user } = useUser()

  const visibleItems = navItems.filter(item =>
    user?.role ? item.roles.includes(user.role) : item.roles.includes('engineer')
  )

  return (
    <div className="flex h-full flex-col bg-green-950 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-green-800">
        <Leaf className="h-6 w-6 text-green-400" />
        <span className="text-lg font-bold tracking-tight">AgroStock</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-700 text-white'
                  : 'text-green-200 hover:bg-green-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      {user && (
        <div className="border-t border-green-800 px-4 py-3">
          <p className="text-xs text-green-400 truncate">{user.full_name}</p>
          <p className="text-xs text-green-600 capitalize">{user.role}</p>
        </div>
      )}
    </div>
  )
}
