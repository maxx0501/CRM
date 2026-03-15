'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut, Menu, Bell, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Kanban,
  Users,
  Calendar,
  MessageSquare,
  DollarSign,
  Megaphone,
  Zap,
  Settings,
} from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/appointments', label: 'Agendamentos', icon: Calendar },
  { href: '/conversations', label: 'Conversas', icon: MessageSquare },
  { href: '/finances', label: 'Financeiro', icon: DollarSign },
  { href: '/campaigns', label: 'Campanhas', icon: Megaphone },
  { href: '/automations', label: 'Automações', icon: Zap },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

function getPageTitle(pathname: string): string {
  const item = navItems.find(
    (n) => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href)),
  )
  return item?.label ?? 'CRM Pro'
}

export function Header() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur-sm lg:px-6">
        {/* Left: hamburger (mobile) + page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-2 hover:bg-accent lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold lg:text-lg">{pageTitle}</h1>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {/* Notification bell placeholder */}
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
          </button>

          <ThemeToggle />

          {/* User menu */}
          <div className="relative ml-1">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {session?.user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
                {session?.user?.name}
              </span>
              <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-border/60 bg-card shadow-lg">
                  <div className="border-b border-border/60 px-4 py-3">
                    <p className="truncate text-sm font-medium">{session?.user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Configurações
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-xl">
            <div className="flex h-16 items-center gap-3 border-b border-border/60 px-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Kanban className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">CRM Pro</span>
            </div>
            <nav className="space-y-0.5 p-3">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
