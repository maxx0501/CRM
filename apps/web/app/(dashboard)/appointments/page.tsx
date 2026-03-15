'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { formatDateTime, formatDate, cn } from '@/lib/utils'
import type { ApiResponse } from '@crm/shared'
import {
  Calendar,
  Plus,
  LayoutList,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  User,
  Search,
  AlertTriangle,
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { AppointmentModal } from './appointment-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Appointment {
  id: string
  title: string
  startsAt: string
  endsAt: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  type?: string | null
  notes?: string | null
  lead?: { id: string; name: string } | null
}

export interface Lead {
  id: string
  name: string
  email?: string | null
}

type ViewMode = 'list' | 'calendar'

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig = {
  SCHEDULED: {
    label: 'Agendado',
    icon: Clock,
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  COMPLETED: {
    label: 'Concluído',
    icon: CheckCircle2,
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    badge: 'bg-red-500/10 text-red-500 border-red-500/20',
    dot: 'bg-red-400',
  },
} as const

const typeLabels: Record<string, string> = {
  MEETING: 'Reunião',
  CONSULTATION: 'Consulta',
  FOLLOW_UP: 'Follow-up',
  DEMO: 'Demo',
  OTHER: 'Outro',
}

// ─── Grouping helpers ─────────────────────────────────────────────────────────

function getGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const nextWeekStart = new Date(today); nextWeekStart.setDate(today.getDate() + 7)

  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (d.getTime() === today.getTime()) return 'Hoje'
  if (d.getTime() === tomorrow.getTime()) return 'Amanhã'
  if (d < today) return 'Anteriores'
  if (d < nextWeekStart) return 'Esta Semana'
  return 'Próximas'
}

const groupOrder = ['Hoje', 'Amanhã', 'Esta Semana', 'Próximas', 'Anteriores']

// ─── Skeletons ────────────────────────────────────────────────────────────────

function AppointmentCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>
    </div>
  )
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  apt,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  apt: Appointment
  onEdit: (a: Appointment) => void
  onDelete: (a: Appointment) => void
  onStatusChange: (id: string, status: Appointment['status']) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status = statusConfig[apt.status] ?? statusConfig.SCHEDULED
  const isToday = getGroup(apt.startsAt) === 'Hoje'

  return (
    <div className={cn(
      'relative rounded-xl border bg-card p-4 transition-all hover:shadow-sm',
      isToday ? 'border-primary/30 bg-primary/[0.02]' : 'border-border',
    )}>
      {isToday && (
        <div className="absolute -top-px left-4 right-4 h-[2px] rounded-t-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
      )}

      <div className="flex items-start gap-3">
        {/* Time block */}
        <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted/60 px-1 py-2 text-center">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {new Date(apt.startsAt).toLocaleDateString('pt-BR', { weekday: 'short' })}
          </span>
          <span className="text-lg font-bold leading-tight">
            {new Date(apt.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm leading-snug">{apt.title}</p>
              {apt.lead && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" /> {apt.lead.name}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn('flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', status.badge)}>
                <status.icon className="h-3 w-3" />
                {status.label}
              </span>

              {/* Menu */}
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-md p-1 hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-border bg-card py-1 shadow-lg text-sm">
                      {apt.status === 'SCHEDULED' && (
                        <>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-muted transition-colors"
                            onClick={() => { onStatusChange(apt.id, 'COMPLETED'); setMenuOpen(false) }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como concluído
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-red-500 hover:bg-muted transition-colors"
                            onClick={() => { onStatusChange(apt.id, 'CANCELLED'); setMenuOpen(false) }}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancelar
                          </button>
                          <div className="my-1 border-t border-border" />
                        </>
                      )}
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
                        onClick={() => { onEdit(apt); setMenuOpen(false) }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => { onDelete(apt); setMenuOpen(false) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(apt.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              {new Date(apt.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {apt.type && (
              <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
                {typeLabels[apt.type] ?? apt.type}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function CalendarView({
  appointments,
  onDaySelect,
  selectedDay,
}: {
  appointments: Appointment[]
  onDaySelect: (date: Date) => void
  selectedDay: Date | null
}) {
  const [viewDate, setViewDate] = useState(() => new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const today = new Date()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Map: date string -> appointments[]
  const aptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const apt of appointments) {
      const d = new Date(apt.startsAt)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString()
        const arr = map.get(key) ?? []
        arr.push(apt)
        map.set(key, arr)
      }
    }
    return map
  }, [appointments, year, month])

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold">{MONTH_NAMES[month]} {year}</h2>
        <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells before month start */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-16 border-b border-r border-border/30" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayApts = aptsByDay.get(day.toString()) ?? []
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          const isSelected = selectedDay?.getFullYear() === year && selectedDay?.getMonth() === month && selectedDay?.getDate() === day
          const col = (firstDay + i) % 7
          const isLastCol = col === 6

          return (
            <button
              key={day}
              onClick={() => onDaySelect(new Date(year, month, day))}
              className={cn(
                'relative flex flex-col items-start h-16 p-1.5 transition-colors text-left',
                !isLastCol && 'border-r border-border/30',
                'border-b border-border/30',
                isSelected ? 'bg-primary/10' : isToday ? 'bg-primary/5' : 'hover:bg-muted/50',
              )}
            >
              <span className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
              )}>
                {day}
              </span>

              {/* Appointment dots */}
              {dayApts.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayApts.slice(0, 3).map((apt) => {
                    const s = statusConfig[apt.status] ?? statusConfig.SCHEDULED
                    return (
                      <span key={apt.id} className={cn('h-1.5 w-1.5 rounded-full', s.dot)} title={apt.title} />
                    )
                  })}
                  {dayApts.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{dayApts.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ title, onConfirm, onCancel, isPending }: {
  title: string; onConfirm: () => void; onCancel: () => void; isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold">Excluir agendamento</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tem certeza que deseja excluir <strong>{title}</strong>?
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={isPending} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors">
            {isPending ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Calendar className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold">Nenhum agendamento encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie seu primeiro agendamento para começar a organizar sua agenda.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" /> Criar primeiro agendamento
      </button>
    </div>
  )
}

// ─── Today Banner ─────────────────────────────────────────────────────────────

function TodayBanner({ appointments, onCreate }: { appointments: Appointment[]; onCreate: () => void }) {
  if (appointments.length === 0) return null
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {appointments.length} agendamento{appointments.length > 1 ? 's' : ''} para hoje
          </span>
        </div>
        <button onClick={onCreate} className="flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus className="h-3 w-3" /> Novo
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {appointments.map((apt) => {
          const status = statusConfig[apt.status] ?? statusConfig.SCHEDULED
          return (
            <div key={apt.id} className="flex items-center gap-2 rounded-lg bg-background/80 px-3 py-2">
              <status.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{apt.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(apt.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium', status.badge)}>
                {status.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const { api } = useApi()
  const queryClient = useQueryClient()

  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Appointment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api<ApiResponse<Appointment[]>>('/appointments'),
  })

  const { data: leadsData } = useQuery({
    queryKey: ['leads-select'],
    queryFn: () => api<ApiResponse<{ leads: Lead[] } | Lead[]>>('/leads?limit=200'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Appointment['status'] }) =>
      api(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setDeleteTarget(null)
    },
  })

  // ── Derived ──
  const allAppointments = data?.data ?? []

  const leadsRaw = leadsData?.data
  const allLeads: Lead[] = Array.isArray(leadsRaw)
    ? leadsRaw as Lead[]
    : (leadsRaw as { leads: Lead[] })?.leads ?? []

  const todayAppointments = useMemo(() =>
    allAppointments.filter((a) => getGroup(a.startsAt) === 'Hoje'),
    [allAppointments],
  )

  const filteredAppointments = useMemo(() => {
    let list = allAppointments
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.lead?.name.toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      list = list.filter((a) => a.status === statusFilter)
    }
    if (selectedDay && view === 'calendar') {
      list = list.filter((a) => {
        const d = new Date(a.startsAt)
        return (
          d.getFullYear() === selectedDay.getFullYear() &&
          d.getMonth() === selectedDay.getMonth() &&
          d.getDate() === selectedDay.getDate()
        )
      })
    }
    return list
  }, [allAppointments, search, statusFilter, selectedDay, view])

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const apt of filteredAppointments) {
      const g = getGroup(apt.startsAt)
      const arr = map.get(g) ?? []
      arr.push(apt)
      map.set(g, arr)
    }
    return map
  }, [filteredAppointments])

  const handleStatusChange = useCallback((id: string, status: Appointment['status']) => {
    updateStatusMutation.mutate({ id, status })
  }, [updateStatusMutation])

  const handleDaySelect = useCallback((date: Date) => {
    setSelectedDay((prev) => {
      if (prev && prev.getTime() === date.getTime()) return null
      return date
    })
  }, [])

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allAppointments.length > 0
              ? `${allAppointments.length} agendamento${allAppointments.length > 1 ? 's' : ''} no total`
              : 'Organize sua agenda e reuniões'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Agendamento
        </button>
      </div>

      {/* ── Today Banner ── */}
      {!isLoading && todayAppointments.length > 0 && (
        <TodayBanner appointments={todayAppointments} onCreate={() => setShowCreateModal(true)} />
      )}

      {/* ── Filters + View Toggle ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou lead..."
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 appearance-none rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">Todos os status</option>
          <option value="SCHEDULED">Agendado</option>
          <option value="COMPLETED">Concluído</option>
          <option value="CANCELLED">Cancelado</option>
        </select>

        <div className="flex items-center rounded-lg border border-input bg-background p-1 gap-0.5">
          <button
            onClick={() => { setView('list'); setSelectedDay(null) }}
            className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all', view === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() => setView('calendar')}
            className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all', view === 'calendar' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <AppointmentCardSkeleton key={i} />)}
        </div>
      ) : allAppointments.length === 0 ? (
        <EmptyState onCreate={() => setShowCreateModal(true)} />
      ) : view === 'calendar' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <CalendarView
            appointments={allAppointments}
            onDaySelect={handleDaySelect}
            selectedDay={selectedDay}
          />

          <div className="space-y-3">
            {selectedDay ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <button onClick={() => setSelectedDay(null)} className="text-xs text-muted-foreground hover:text-foreground">
                    Limpar
                  </button>
                </div>
                {filteredAppointments.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia.</p>
                    <button onClick={() => setShowCreateModal(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Criar agendamento
                    </button>
                  </div>
                ) : (
                  filteredAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      apt={apt}
                      onEdit={setEditTarget}
                      onDelete={setDeleteTarget}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-16 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Selecione um dia no calendário para ver os agendamentos.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List view — grouped */
        <div className="space-y-6">
          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-16 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado para os filtros aplicados.</p>
              <button onClick={() => { setSearch(''); setStatusFilter('') }} className="text-xs text-primary hover:underline">
                Limpar filtros
              </button>
            </div>
          ) : (
            groupOrder
              .filter((g) => grouped.has(g))
              .map((group) => (
                <div key={group}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-muted-foreground">{group}</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {grouped.get(group)!.length}
                    </span>
                    <div className="flex-1 border-t border-border/50" />
                  </div>
                  <div className="space-y-2">
                    {grouped.get(group)!
                      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                      .map((apt) => (
                        <AppointmentCard
                          key={apt.id}
                          apt={apt}
                          onEdit={setEditTarget}
                          onDelete={setDeleteTarget}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <AppointmentModal
        open={showCreateModal || !!editTarget}
        appointment={editTarget}
        leads={allLeads}
        onClose={() => { setShowCreateModal(false); setEditTarget(null) }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['appointments'] })}
        api={api}
      />

      {deleteTarget && (
        <DeleteConfirm
          title={deleteTarget.title}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
