'use client'

import { useState } from 'react'
import { Menu, X, LogOut } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { navItems } from './nav-items'

export function Header() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const currentPage = navItems.find(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    queryClient.clear()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 shadow-sm lg:px-6">
      {/* Mobile menu trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'lg:hidden')}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <h1 className="flex-1 text-base font-semibold text-gray-800 lg:text-lg">
        {currentPage?.label ?? 'AgroStock'}
      </h1>

      {/* Logout */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="gap-2 text-gray-600 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Salir</span>
      </Button>
    </header>
  )
}
