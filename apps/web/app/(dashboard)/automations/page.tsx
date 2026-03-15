'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@crm/shared'
import {
  Zap,
  Plus,
  X,
  Pencil,
  Trash2,
  Play,
  Pause,
  Users,
  GitBranch,
  MessageSquare,
  Calendar,
  Bell,
  MoveRight,
  ChevronRight,
  Activity,
  Search,
  Settings2,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Automation {
  id: string
  name: string
  isActive: boolean
  triggerType?: string | null
  triggerSource?: string | null
  triggerStage?: { id: string; name: string } | null
  actionType?: string | null
  description?: string | null
  _count?: { steps: number; enrollments: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGERS = [
  { value: 'NEW_LEAD', label: 'Novo lead criado', icon: Users, description: 'Dispara quando um lead é cadastrado' },
  { value: 'STAGE_CHANGED', label: 'Lead mudou de etapa', icon: GitBranch, description: 'Dispara quando um lead avança no pipeline' },
  { value: 'APPOINTMENT_CREATED', label: 'Agendamento criado', icon: Calendar, description: 'Dispara quando um agendamento é feito' },
  { value: 'LEAD_SOURCE', label: 'Lead por origem', icon: MoveRight, description: 'Dispara quando lead chega de uma fonte específica' },
]

const ACTIONS = [
  { value: 'SEND_MESSAGE', label: 'Enviar mensagem', icon: MessageSquare, description: 'Envia uma mensagem WhatsApp' },
  { value: 'MOVE_STAGE', label: 'Mover no pipeline', icon: GitBranch, description: 'Move o lead para outra etapa' },
  { value: 'CREATE_APPOINTMENT', label: 'Criar agendamento', icon: Calendar, description: 'Cria um agendamento automaticamente' },
  { value: 'SEND_NOTIFICATION', label: 'Notificar', icon: Bell, description: 'Envia uma notificação interna' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/60', className)} />
}

function getTriggerConfig(triggerType?: string | null) {
  return TRIGGERS.find((t) => t.value === triggerType) ?? {
    label: triggerType ?? 'Gatilho',
    icon: Zap,
    description: '',
  }
}

function getActionConfig(actionType?: string | null) {
  return ACTIONS.find((a) => a.value === actionType) ?? {
    label: actionType ?? 'Ação',
    icon: Settings2,
    description: '',
  }
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-emerald-500' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

// ─── Automation Card ──────────────────────────────────────────────────────────

interface CardProps {
  automation: Automation
  onEdit: (a: Automation) => void
  onDelete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
  isToggling: boolean
}

function AutomationCard({ automation: a, onEdit, onDelete, onToggle, isToggling }: CardProps) {
  const trigger = getTriggerConfig(a.triggerType)
  const action = getActionConfig(a.actionType)
  const TriggerIcon = trigger.icon
  const ActionIcon = action.icon

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 transition-all hover:shadow-md flex flex-col gap-4',
        !a.isActive && 'opacity-70',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              a.isActive ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-muted',
            )}
          >
            <Zap
              className={cn('h-5 w-5', a.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{a.name}</h3>
            {a.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</p>
            )}
          </div>
        </div>
        <Toggle
          checked={a.isActive}
          onChange={() => onToggle(a.id, !a.isActive)}
          disabled={isToggling}
        />
      </div>

      {/* Trigger → Action flow */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5 min-w-0">
          <TriggerIcon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gatilho</p>
            <p className="text-xs font-medium truncate">{trigger.label}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-primary/5 px-3 py-2.5 min-w-0">
          <ActionIcon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ação</p>
            <p className="text-xs font-medium truncate">{action.label}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Settings2 className="h-3.5 w-3.5" />
          {a._count?.steps ?? 0} {a._count?.steps === 1 ? 'passo' : 'passos'}
        </span>
        <span className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" />
          {a._count?.enrollments ?? 0} execuções
        </span>
        {a.triggerSource && (
          <span className="flex items-center gap-1">
            <MoveRight className="h-3.5 w-3.5" />
            {a.triggerSource}
          </span>
        )}
        {a.triggerStage && (
          <span className="flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5" />
            {a.triggerStage.name}
          </span>
        )}
      </div>

      {/* Status + Actions */}
      <div className="flex items-center justify-between border-t pt-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
            a.isActive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {a.isActive ? (
            <Play className="h-3 w-3 fill-current" />
          ) : (
            <Pause className="h-3 w-3 fill-current" />
          )}
          {a.isActive ? 'Ativa' : 'Inativa'}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(a)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-accent transition-colors"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => onDelete(a.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  isPending: boolean
  error: string
  editData?: Automation | null
}

function AutomationModal({ open, onClose, onSubmit, isPending, error, editData }: ModalProps) {
  const [selectedTrigger, setSelectedTrigger] = useState(editData?.triggerType ?? '')
  const [selectedAction, setSelectedAction] = useState(editData?.actionType ?? '')

  if (!open) return null
  const isEdit = !!editData

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSubmit({
      name: fd.get('name'),
      description: fd.get('description') || undefined,
      triggerType: fd.get('triggerType') || undefined,
      triggerSource: fd.get('triggerSource') || undefined,
      actionType: fd.get('actionType') || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b bg-card/95 backdrop-blur px-6 py-4 z-10">
          <div>
            <h2 className="text-base font-semibold">{isEdit ? 'Editar Automação' : 'Nova Automação'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure gatilho e ação para automatizar tarefas
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome da Automação *</label>
            <input
              name="name"
              required
              defaultValue={editData?.name}
              placeholder="Ex: Follow-up após cadastro"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <input
              name="description"
              defaultValue={editData?.description ?? ''}
              placeholder="O que essa automação faz..."
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Trigger selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Gatilho (quando acionar?)</label>
            <input type="hidden" name="triggerType" value={selectedTrigger} />
            <div className="grid grid-cols-2 gap-2">
              {TRIGGERS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSelectedTrigger(t.value)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all',
                      selectedTrigger === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-accent/40',
                    )}
                  >
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', selectedTrigger === t.value ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <p className="text-xs font-semibold">{t.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Source if trigger is LEAD_SOURCE */}
          {selectedTrigger === 'LEAD_SOURCE' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Origem do Lead</label>
              <input
                name="triggerSource"
                defaultValue={editData?.triggerSource ?? ''}
                placeholder="Ex: instagram, google, indicação..."
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {/* Action selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ação (o que fazer?)</label>
            <input type="hidden" name="actionType" value={selectedAction} />
            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map((a) => {
                const Icon = a.icon
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setSelectedAction(a.value)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all',
                      selectedAction === a.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-accent/40',
                    )}
                  >
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', selectedAction === a.value ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <p className="text-xs font-semibold">{a.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{a.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preview */}
          {selectedTrigger && selectedAction && (
            <div className="rounded-lg bg-muted/40 border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resumo</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{getTriggerConfig(selectedTrigger).label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-primary">{getActionConfig(selectedAction).label}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Automação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const { api } = useApi()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingAuto, setEditingAuto] = useState<Automation | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [modalError, setModalError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api<ApiResponse<Automation[]>>('/automations'),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api('/automations', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      setShowModal(false)
      setModalError('')
    },
    onError: (err: Error) => setModalError(err.message || 'Erro ao criar automação'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api(`/automations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      setEditingAuto(null)
      setTogglingId(null)
      setModalError('')
    },
    onError: (err: Error) => {
      setModalError(err.message || 'Erro ao atualizar automação')
      setTogglingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/automations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      setDeleteId(null)
    },
  })

  const automations = data?.data ?? []

  const filtered = automations.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && a.isActive) ||
      (filterStatus === 'inactive' && !a.isActive)
    return matchSearch && matchStatus
  })

  const activeCount = automations.filter((a) => a.isActive).length
  const totalEnrollments = automations.reduce((sum, a) => sum + (a._count?.enrollments ?? 0), 0)

  const isModalPending = createMutation.isPending || updateMutation.isPending
  const isEmpty = !isLoading && automations.length === 0

  function handleToggle(id: string, active: boolean) {
    setTogglingId(id)
    updateMutation.mutate({ id, data: { isActive: active } })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automações</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure regras automáticas para economizar tempo
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setModalError('') }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Automação
        </button>
      </div>

      {/* Quick stats */}
      {!isEmpty && (
        <div className="grid gap-3 grid-cols-3">
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-0.5">{automations.length}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Ativas</p>
            <p className="text-2xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Execuções</p>
            <p className="text-2xl font-bold mt-0.5">{totalEnrollments}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhuma automação ainda</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Automações executam tarefas repetitivas automaticamente. Configure gatilhos e ações para economizar horas do seu dia.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm w-full text-center">
            {[
              { icon: Users, text: 'Novo lead' },
              { icon: ArrowRight, text: '' },
              { icon: MessageSquare, text: 'Envia msg' },
            ].map((item, i) => {
              const Icon = item.icon
              return item.text ? (
                <div key={i} className="rounded-lg bg-muted/40 p-3">
                  <Icon className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-1.5 text-xs text-muted-foreground">{item.text}</p>
                </div>
              ) : (
                <div key={i} className="flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              )
            })}
          </div>
          <button
            onClick={() => { setShowModal(true); setModalError('') }}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Criar primeira automação
          </button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar automações..."
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
                    filterStatus === f
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Inativas'}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-14 flex-1 rounded-lg" />
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-14 flex-1 rounded-lg" />
                    </div>
                    <Skeleton className="h-8 rounded-lg" />
                  </div>
                ))
              : filtered.map((a) => (
                  <AutomationCard
                    key={a.id}
                    automation={a}
                    onEdit={(a) => { setEditingAuto(a); setModalError('') }}
                    onDelete={setDeleteId}
                    onToggle={handleToggle}
                    isToggling={togglingId === a.id && updateMutation.isPending}
                  />
                ))}
          </div>

          {filtered.length === 0 && !isLoading && (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <p className="text-muted-foreground text-sm">Nenhuma automação encontrada.</p>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <AutomationModal
        open={showModal || !!editingAuto}
        onClose={() => { setShowModal(false); setEditingAuto(null); setModalError('') }}
        onSubmit={(data) => {
          if (editingAuto) updateMutation.mutate({ id: editingAuto.id, data })
          else createMutation.mutate(data)
        }}
        isPending={isModalPending}
        error={modalError}
        editData={editingAuto}
      />

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="mt-4 text-center text-base font-semibold">Excluir automação?</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Os leads já inscritos não serão afetados imediatamente.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
