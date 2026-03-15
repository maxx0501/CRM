'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { useWorkspace } from '@/hooks/use-workspace'
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
  ChevronRight,
  Building2,
} from 'lucide-react'

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

const navGroups = [
  {
    label: 'Principal',
    items: navItems.slice(0, 2),
  },
  {
    label: 'Gestão',
    items: navItems.slice(2, 6),
  },
  {
    label: 'Marketing',
    items: navItems.slice(6, 8),
  },
  {
    label: 'Sistema',
    items: navItems.slice(8),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-border/60 bg-card lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border/60 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Kanban className="h-4 w-4 text-primary-foreground" />
        </div>
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          CRM Pro
        </Link>
      </div>

      {/* Workspace badge */}
      {session?.user?.name && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium text-muted-foreground">
            {session.user.name}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="h-3 w-3 text-primary-foreground/70" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{session?.user?.name ?? 'Usuário'}</p>
            <p className="truncate text-[10px] text-muted-foreground">{session?.user?.email ?? ''}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
