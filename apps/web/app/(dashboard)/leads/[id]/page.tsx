'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils'
import type { ApiResponse } from '@crm/shared'
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  MessageSquare,
  Plus,
  Clock,
  Activity,
  Banknote,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  TrendingUp,
} from 'lucide-react'
import { useState, useRef } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadDetail {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  source: string
  score: number
  value?: number | null
  stage: { id: string; name: string; color: string }
  createdAt: string
  notes: Array<{ id: string; content: string; createdAt: string }>
  activities: Array<{ id: string; type: string; description: string; createdAt: string }>
  tags: Array<{ tag: { id: string; name: string; color: string } }>
  appointments: Array<{ id: string; title: string; startsAt: string; status: string }>
  transactions: Array<{ id: string; description: string; amount: number; type: string; isPaid: boolean }>
}

type Tab = 'timeline' | 'notes' | 'appointments' | 'finances'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LeadDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-7 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-12 bg-muted rounded-xl" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Activity Icon ────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    NOTE: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    STAGE_CHANGE: { icon: ArrowLeft, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    EMAIL: { icon: Mail, color: 'text-green-500', bg: 'bg-green-500/10' },
    CALL: { icon: Phone, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    APPOINTMENT: { icon: Calendar, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  }
  const cfg = map[type] ?? { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted' }
  return (
    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', cfg.bg)}>
      <cfg.icon className={cn('h-3.5 w-3.5', cfg.color)} />
    </div>
  )
}

// ─── Appointment status map ───────────────────────────────────────────────────

const aptStatusMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  SCHEDULED: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Clock },
  COMPLETED: { label: 'Concluído', color: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-500', icon: XCircle },
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel, isPending }: {
  name: string; onConfirm: () => void; onCancel: () => void; isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold">Excluir lead</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tem certeza que deseja excluir <strong>{name}</strong>? Todos os dados serão perdidos permanentemente.
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { api } = useApi()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('timeline')
  const [newNote, setNewNote] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api<ApiResponse<LeadDetail>>(`/leads/${id}`),
  })

  const addNoteMutation = useMutation({
    mutationFn: (content: string) =>
      api(`/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      setNewNote('')
      noteRef.current?.focus()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api(`/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      router.push('/leads')
    },
  })

  if (isLoading) return <LeadDetailSkeleton />

  const lead = data?.data
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-lg font-semibold">Lead não encontrado</p>
        <Link href="/leads" className="flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para Leads
        </Link>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'timeline', label: 'Timeline', icon: Activity, count: (lead.activities ?? []).length },
    { key: 'notes', label: 'Notas', icon: MessageSquare, count: (lead.notes ?? []).length },
    { key: 'appointments', label: 'Agendamentos', icon: Calendar, count: (lead.appointments ?? []).length },
    { key: 'finances', label: 'Financeiro', icon: DollarSign, count: (lead.transactions ?? []).length },
  ]

  const totalIncome = (lead.transactions ?? [])
    .filter((t: { type: string; isPaid: boolean }) => t.type === 'INCOME' && t.isPaid)
    .reduce((s: number, t: { amount: number }) => s + t.amount, 0)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg select-none">
            {lead.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{lead.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5" /> {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5" /> {lead.email}
                </a>
              )}
              <span className="text-muted-foreground/50">•</span>
              <span>Cadastrado em {formatDate(lead.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: lead.stage.color }}
          >
            {lead.stage.name}
          </span>
          <Link
            href={`/leads/${lead.id}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        </div>
      </div>

      {/* ── Tags ── */}
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lead.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Valor Estimado"
          value={lead.value ? formatCurrency(lead.value) : '—'}
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          label="Score"
          value={`${lead.score} pts`}
          sub="Pontuação de engajamento"
          icon={TrendingUp}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          label="Agendamentos"
          value={String(lead.appointments.length)}
          sub={lead.appointments.filter((a) => a.status === 'SCHEDULED').length > 0 ? `${lead.appointments.filter((a) => a.status === 'SCHEDULED').length} pendente(s)` : 'Todos concluídos'}
          icon={Calendar}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          label="Receita Gerada"
          value={totalIncome > 0 ? formatCurrency(totalIncome) : '—'}
          sub={lead.transactions.length > 0 ? `${lead.transactions.length} transação(ões)` : 'Nenhuma transação'}
          icon={Banknote}
          color="bg-orange-500/10 text-orange-500"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-semibold min-w-[18px] text-center',
                  activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}

      {/* Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-1">
          {lead.activities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            </div>
          ) : (
            <div className="relative pl-4">
              <div className="absolute left-7 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {lead.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 items-start">
                    <div className="shrink-0 z-10">
                      <ActivityIcon type={activity.type} />
                    </div>
                    <div className="flex-1 min-w-0 rounded-lg border border-border/50 bg-card/50 px-4 py-3">
                      <p className="text-sm">{activity.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add note */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-sm font-medium">Adicionar nota</label>
            <textarea
              ref={noteRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Escreva uma nota sobre este lead..."
              rows={3}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newNote.trim()) {
                  addNoteMutation.mutate(newNote.trim())
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Ctrl+Enter para enviar</p>
              <button
                onClick={() => { if (newNote.trim()) addNoteMutation.mutate(newNote.trim()) }}
                disabled={!newNote.trim() || addNoteMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                {addNoteMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>

          {/* Notes list */}
          {lead.notes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma nota adicionada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lead.notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appointments */}
      {activeTab === 'appointments' && (
        <div className="space-y-3">
          {lead.appointments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum agendamento para este lead.</p>
              <Link
                href="/appointments"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> Criar agendamento
              </Link>
            </div>
          ) : (
            lead.appointments.map((apt) => {
              const status = aptStatusMap[apt.status] ?? aptStatusMap.SCHEDULED
              return (
                <div key={apt.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{apt.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDateTime(apt.startsAt)}
                      </p>
                    </div>
                  </div>
                  <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', status.color)}>
                    <status.icon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Finances */}
      {activeTab === 'finances' && (
        <div className="space-y-3">
          {lead.transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma transação registrada.</p>
            </div>
          ) : (
            lead.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tx.type === 'INCOME' ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                    <DollarSign className={cn('h-4 w-4', tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500')} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <span className={cn('text-xs font-medium', tx.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                      {tx.isPaid ? '✓ Pago' : '⏳ Pendente'}
                    </span>
                  </div>
                </div>
                <span className={cn('text-sm font-bold', tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && (
        <DeleteConfirm
          name={lead.name}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDeleteConfirm(false)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
