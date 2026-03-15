'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { ApiResponse, DashboardMetrics } from '@crm/shared'
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  UserPlus,
  Banknote,
  ChevronRight,
  Activity,
} from 'lucide-react'

// ─── Type definitions ───────────────────────────────────────────────────────

interface Appointment {
  id: string
  title: string
  startTime: string
  lead?: { id: string; name: string } | null
}

interface ActivityItem {
  id: string
  type: 'lead_created' | 'appointment_scheduled' | 'transaction_added' | 'lead_moved' | string
  description: string
  createdAt: string
  lead?: { id: string; name: string } | null
}

interface RevenuePoint {
  month: string
  revenue: number
}

interface LeadsByStage {
  stageName: string
  color: string
  count: number
}

interface DashboardSummary {
  totalLeads: number
  totalLeadsChange: number
  appointmentsToday: number
  appointmentsTodayChange: number
  revenueThisMonth: number
  revenueThisMonthChange: number
  conversionRate: number
  conversionRateChange: number
  revenueByMonth?: RevenuePoint[]
  leadsByStage?: LeadsByStage[]
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ''}`} style={style} />
}

// ─── Stat Card ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  change?: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  loading?: boolean
}

function StatCard({ label, value, change, icon: Icon, iconColor, iconBg, loading }: StatCardProps) {
  const isPositive = (change ?? 0) >= 0

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-2">
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
          </div>
          {change !== undefined && !loading && (
            <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span>{Math.abs(change).toFixed(1)}% vs. mês anterior</span>
            </div>
          )}
          {change === undefined && !loading && (
            <div className="mt-1.5 h-4" />
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}

// ─── Revenue Chart (CSS bars) ─────────────────────────────────────────────

function RevenueChart({ data, loading }: { data?: RevenuePoint[]; loading: boolean }) {
  const maxRevenue = data ? Math.max(...data.map((d) => d.revenue), 1) : 1

  if (loading) {
    return (
      <div className="flex h-40 items-end gap-2 px-2">
        {[40, 65, 50, 80, 55, 70].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` } as React.CSSProperties} />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Sem dados de receita ainda
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex h-40 items-end gap-2">
        {data.map((point) => {
          const heightPct = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0
          return (
            <div key={point.month} className="group relative flex flex-1 flex-col items-center justify-end gap-1">
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 rounded-md border border-border/60 bg-card px-2 py-1 text-xs shadow-lg group-hover:block whitespace-nowrap">
                {formatCurrency(point.revenue)}
              </div>
              <div
                className="w-full rounded-t-md bg-primary/80 transition-all duration-300 hover:bg-primary"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        {data.map((point) => (
          <div key={point.month} className="flex-1 text-center text-[10px] text-muted-foreground">
            {point.month}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Leads by stage chart ──────────────────────────────────────────────────

function LeadsStageChart({ data, loading }: { data?: LeadsByStage[]; loading: boolean }) {
  const maxCount = data ? Math.max(...data.map((d) => d.count), 1) : 1
  const total = data ? data.reduce((sum, d) => sum + d.count, 0) : 0

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Nenhum lead cadastrado ainda
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.map((stage) => {
        const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
        const pct = total > 0 ? ((stage.count / total) * 100).toFixed(0) : '0'
        return (
          <div key={stage.stageName} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="font-medium">{stage.stageName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{stage.count} leads</span>
                <span className="font-medium text-foreground">{pct}%</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${widthPct}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Activity feed item ────────────────────────────────────────────────────

function activityIcon(type: string) {
  switch (type) {
    case 'lead_created':
      return <UserPlus className="h-3.5 w-3.5 text-blue-500" />
    case 'appointment_scheduled':
      return <Calendar className="h-3.5 w-3.5 text-amber-500" />
    case 'transaction_added':
      return <Banknote className="h-3.5 w-3.5 text-emerald-500" />
    case 'lead_moved':
      return <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { api } = useApi()
  const { data: session } = useSession()
  const router = useRouter()

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api<ApiResponse<DashboardSummary>>('/dashboard/summary'),
    // fallback to metrics endpoint if summary not available
  })

  // Fallback: try the /dashboard/metrics endpoint that already exists
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api<ApiResponse<DashboardMetrics>>('/dashboard/metrics'),
    enabled: !summaryData?.data,
  })

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => api<ApiResponse<ActivityItem[]>>('/dashboard/recent-activity'),
  })

  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments-upcoming'],
    queryFn: () => api<ApiResponse<Appointment[]>>('/appointments?upcoming=true&limit=5'),
  })

  const loading = summaryLoading && metricsLoading

  // Merge summary + metrics for backwards compat
  const summary = summaryData?.data
  const metrics = metricsData?.data

  const totalLeads = summary?.totalLeads ?? metrics?.totalLeads ?? 0
  const appointmentsToday = summary?.appointmentsToday ?? metrics?.upcomingAppointments ?? 0
  const revenueThisMonth = summary?.revenueThisMonth ?? metrics?.revenueThisMonth ?? 0
  const conversionRate = summary?.conversionRate ?? metrics?.conversionRate ?? 0

  const activities = activityData?.data ?? []
  const appointments = appointmentsData?.data ?? []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = session?.user?.name?.split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja o resumo do seu negócio hoje.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => router.push('/leads')}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
        >
          <Plus className="h-3.5 w-3.5 text-primary" />
          Novo Lead
        </button>
        <button
          onClick={() => router.push('/appointments')}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium shadow-sm transition-all hover:border-amber-400/40 hover:bg-amber-50/50 hover:shadow-md dark:hover:bg-amber-900/20"
        >
          <Calendar className="h-3.5 w-3.5 text-amber-500" />
          Agendar
        </button>
        <button
          onClick={() => router.push('/finances')}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium shadow-sm transition-all hover:border-emerald-400/40 hover:bg-emerald-50/50 hover:shadow-md dark:hover:bg-emerald-900/20"
        >
          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          Adicionar Transação
        </button>
        <button
          onClick={() => router.push('/pipeline')}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium shadow-sm transition-all hover:border-purple-400/40 hover:bg-purple-50/50 hover:shadow-md dark:hover:bg-purple-900/20"
        >
          <Target className="h-3.5 w-3.5 text-purple-500" />
          Ver Pipeline
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total de Leads"
          value={totalLeads.toLocaleString('pt-BR')}
          change={summary?.totalLeadsChange}
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/30"
          loading={loading}
        />
        <StatCard
          label="Agendamentos Hoje"
          value={appointmentsToday}
          change={summary?.appointmentsTodayChange}
          icon={Calendar}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          loading={loading}
        />
        <StatCard
          label="Receita do Mês"
          value={formatCurrency(revenueThisMonth)}
          change={summary?.revenueThisMonthChange}
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          loading={loading}
        />
        <StatCard
          label="Taxa de Conversão"
          value={`${conversionRate.toFixed(1)}%`}
          change={summary?.conversionRateChange}
          icon={Target}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-50 dark:bg-purple-900/30"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Revenue chart – wider */}
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Receita Mensal</h2>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <RevenueChart data={summary?.revenueByMonth} loading={loading} />
        </div>

        {/* Leads by stage – narrower */}
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Leads por Etapa</h2>
              <p className="text-xs text-muted-foreground">Distribuição atual</p>
            </div>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <LeadsStageChart data={summary?.leadsByStage} loading={loading} />
        </div>
      </div>

      {/* Bottom row: Activity + Upcoming */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Activity feed */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Atividade Recente</h2>
              <p className="text-xs text-muted-foreground">Últimas ações no sistema</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border/40">
            {activityLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Activity className="h-8 w-8 opacity-40" />
                <p className="text-sm">Nenhuma atividade ainda</p>
              </div>
            ) : (
              activities.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    {activityIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Próximos Agendamentos</h2>
              <p className="text-xs text-muted-foreground">Agenda dos próximos dias</p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border/40">
            {appointmentsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Calendar className="h-8 w-8 opacity-40" />
                <p className="text-sm">Nenhum agendamento futuro</p>
              </div>
            ) : (
              appointments.map((apt) => {
                const dt = new Date(apt.startTime)
                const day = dt.toLocaleString('pt-BR', { day: '2-digit', month: 'short' })
                const time = dt.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={apt.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                      <span className="text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400 leading-none">
                        {day.split(' ')[1]}
                      </span>
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-300 leading-none">
                        {day.split(' ')[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{apt.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{time}</span>
                        {apt.lead && <span>· {apt.lead.name}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  </div>
                )
              })
            )}
          </div>
          {appointments.length > 0 && (
            <div className="border-t border-border/60 px-5 py-3">
              <button
                onClick={() => router.push('/appointments')}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todos os agendamentos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
