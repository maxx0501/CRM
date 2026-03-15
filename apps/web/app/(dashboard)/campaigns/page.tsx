'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { formatDate, cn } from '@/lib/utils'
import type { ApiResponse } from '@crm/shared'
import {
  Megaphone,
  Plus,
  X,
  Search,
  Users,
  Send,
  Eye,
  CheckCheck,
  Pencil,
  Trash2,
  Play,
  Pause,
  BarChart2,
  Calendar,
  Tag,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  budget?: number | null
  isActive: boolean
  createdAt?: string
  _count?: { leads: number }
  // Extended stats (may or may not exist depending on API)
  sentCount?: number
  deliveredCount?: number
  readCount?: number
  status?: 'rascunho' | 'ativa' | 'concluida' | 'pausada'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/60', className)} />
}

function StatusBadge({ campaign }: { campaign: Campaign }) {
  const status = campaign.status ?? (campaign.isActive ? 'ativa' : 'rascunho')

  const map: Record<string, { label: string; cls: string }> = {
    ativa: {
      label: 'Ativa',
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    },
    concluida: {
      label: 'Concluída',
      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
    },
    pausada: {
      label: 'Pausada',
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    },
    rascunho: {
      label: 'Rascunho',
      cls: 'bg-muted text-muted-foreground',
    },
  }

  const config = map[status] ?? map.rascunho

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.cls)}>
      {config.label}
    </span>
  )
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────

interface CardProps {
  campaign: Campaign
  onEdit: (c: Campaign) => void
  onDelete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
  onSelect: (c: Campaign) => void
}

function CampaignCard({ campaign: c, onEdit, onDelete, onToggle, onSelect }: CardProps) {
  const leads = c._count?.leads ?? 0
  const sent = c.sentCount ?? 0
  const delivered = c.deliveredCount ?? 0
  const read = c.readCount ?? 0

  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0
  const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0

  return (
    <div className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-border/80 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{c.name}</h3>
            {c.createdAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Criada em {formatDate(c.createdAt)}
              </p>
            )}
          </div>
        </div>
        <StatusBadge campaign={c} />
      </div>

      {/* UTM tags */}
      {(c.utmSource || c.utmMedium || c.utmCampaign) && (
        <div className="flex flex-wrap gap-1.5">
          {c.utmSource && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              {c.utmSource}
            </span>
          )}
          {c.utmMedium && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              {c.utmMedium}
            </span>
          )}
          {c.utmCampaign && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              {c.utmCampaign}
            </span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/40 px-2 py-2">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-base font-bold tabular-nums">{leads}</p>
          <p className="text-[10px] text-muted-foreground">Leads</p>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-2">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Send className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-base font-bold tabular-nums">{sent > 0 ? `${deliveryRate}%` : '—'}</p>
          <p className="text-[10px] text-muted-foreground">Entrega</p>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-2">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-base font-bold tabular-nums">{delivered > 0 ? `${readRate}%` : '—'}</p>
          <p className="text-[10px] text-muted-foreground">Leitura</p>
        </div>
      </div>

      {/* Budget */}
      {c.budget && (
        <div className="flex items-center justify-between text-sm border-t pt-3">
          <span className="text-muted-foreground">Orçamento</span>
          <span className="font-semibold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.budget))}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t pt-3">
        <button
          onClick={() => onSelect(c)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Detalhes
          <ChevronRight className="h-3 w-3 ml-auto" />
        </button>
        <button
          onClick={() => onToggle(c.id, !c.isActive)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
            c.isActive
              ? 'hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-950/40'
              : 'hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/40',
          )}
          title={c.isActive ? 'Pausar' : 'Ativar'}
        >
          {c.isActive ? (
            <Pause className="h-3.5 w-3.5 text-amber-600" />
          ) : (
            <Play className="h-3.5 w-3.5 text-emerald-600" />
          )}
        </button>
        <button
          onClick={() => onEdit(c)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-accent transition-colors"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={() => onDelete(c.id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
          title="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
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
  editData?: Campaign | null
}

function CampaignModal({ open, onClose, onSubmit, isPending, error, editData }: ModalProps) {
  if (!open) return null
  const isEdit = !!editData

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSubmit({
      name: fd.get('name'),
      utmSource: fd.get('utmSource') || undefined,
      utmMedium: fd.get('utmMedium') || undefined,
      utmCampaign: fd.get('utmCampaign') || undefined,
      budget: fd.get('budget') ? Number(fd.get('budget')) : undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">{isEdit ? 'Editar Campanha' : 'Nova Campanha'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Atualize os dados da campanha' : 'Crie uma nova campanha de marketing'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome da Campanha *</label>
            <input
              name="name"
              required
              defaultValue={editData?.name}
              placeholder="Ex: Black Friday 2025"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Parâmetros UTM (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">UTM Source</label>
                <input
                  name="utmSource"
                  defaultValue={editData?.utmSource ?? ''}
                  placeholder="google, facebook..."
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">UTM Medium</label>
                <input
                  name="utmMedium"
                  defaultValue={editData?.utmMedium ?? ''}
                  placeholder="cpc, email, social..."
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">UTM Campaign</label>
              <input
                name="utmCampaign"
                defaultValue={editData?.utmCampaign ?? ''}
                placeholder="black_friday_2025"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Orçamento (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <input
                name="budget"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editData?.budget ?? ''}
                placeholder="0,00"
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Campanha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────

function CampaignDetail({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  if (!campaign) return null

  const leads = campaign._count?.leads ?? 0
  const sent = campaign.sentCount ?? 0
  const delivered = campaign.deliveredCount ?? 0
  const read = campaign.readCount ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="h-full w-full max-w-sm border-l bg-card shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-card/95 backdrop-blur px-5 py-4">
          <h2 className="text-base font-semibold">Detalhes da Campanha</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{campaign.name}</h3>
              <StatusBadge campaign={campaign} />
            </div>
          </div>

          {/* Stats */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Performance</p>
            <div className="space-y-3">
              <StatRow icon={Users} label="Total de Leads" value={String(leads)} />
              <StatRow icon={Send} label="Enviados" value={String(sent)} />
              <StatRow icon={CheckCheck} label="Entregues" value={`${delivered} ${sent > 0 ? `(${Math.round((delivered / sent) * 100)}%)` : ''}`} />
              <StatRow icon={Eye} label="Lidos" value={`${read} ${delivered > 0 ? `(${Math.round((read / delivered) * 100)}%)` : ''}`} />
            </div>
          </div>

          {/* UTM */}
          {(campaign.utmSource || campaign.utmMedium || campaign.utmCampaign) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Rastreamento UTM</p>
              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                {campaign.utmSource && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Source</span>
                    <span className="font-medium">{campaign.utmSource}</span>
                  </div>
                )}
                {campaign.utmMedium && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Medium</span>
                    <span className="font-medium">{campaign.utmMedium}</span>
                  </div>
                )}
                {campaign.utmCampaign && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Campaign</span>
                    <span className="font-medium">{campaign.utmCampaign}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Budget + Date */}
          <div className="space-y-2">
            {campaign.budget && (
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Orçamento
                </span>
                <span className="font-semibold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(campaign.budget))}
                </span>
              </div>
            )}
            {campaign.createdAt && (
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Criada em
                </span>
                <span className="font-medium">{formatDate(campaign.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { api } = useApi()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [modalError, setModalError] = useState('')
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api<ApiResponse<Campaign[]>>('/campaigns'),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setShowModal(false)
      setModalError('')
    },
    onError: (err: Error) => setModalError(err.message || 'Erro ao criar campanha'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setEditingCampaign(null)
      setModalError('')
    },
    onError: (err: Error) => setModalError(err.message || 'Erro ao atualizar campanha'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/campaigns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setDeleteId(null)
    },
  })

  const campaigns = data?.data ?? []

  const filtered = campaigns.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchActive =
      filterActive === 'all' ||
      (filterActive === 'active' && c.isActive) ||
      (filterActive === 'inactive' && !c.isActive)
    return matchSearch && matchActive
  })

  const isModalPending = createMutation.isPending || updateMutation.isPending
  const isEmpty = !isLoading && campaigns.length === 0

  const activeCount = campaigns.filter((c) => c.isActive).length
  const totalLeads = campaigns.reduce((sum, c) => sum + (c._count?.leads ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie suas campanhas de marketing e rastreamento
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setModalError('') }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* Quick stats */}
      {!isEmpty && (
        <div className="grid gap-3 grid-cols-3">
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-0.5">{campaigns.length}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Ativas</p>
            <p className="text-2xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Leads</p>
            <p className="text-2xl font-bold mt-0.5">{totalLeads}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhuma campanha ainda</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Crie campanhas para rastrear a origem dos seus leads e medir o retorno das suas ações de marketing.
          </p>
          <button
            onClick={() => { setShowModal(true); setModalError('') }}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Criar primeira campanha
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
                placeholder="Buscar campanhas..."
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterActive(f)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
                    filterActive === f
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
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((j) => <Skeleton key={j} className="h-16 rounded-lg" />)}
                    </div>
                    <Skeleton className="h-8 rounded-lg" />
                  </div>
                ))
              : filtered.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onEdit={(c) => { setEditingCampaign(c); setModalError('') }}
                    onDelete={setDeleteId}
                    onToggle={(id, active) => updateMutation.mutate({ id, data: { isActive: active } })}
                    onSelect={setSelectedCampaign}
                  />
                ))}
          </div>

          {filtered.length === 0 && !isLoading && (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <p className="text-muted-foreground text-sm">Nenhuma campanha encontrada com esses filtros.</p>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <CampaignModal
        open={showModal || !!editingCampaign}
        onClose={() => { setShowModal(false); setEditingCampaign(null); setModalError('') }}
        onSubmit={(data) => {
          if (editingCampaign) updateMutation.mutate({ id: editingCampaign.id, data })
          else createMutation.mutate(data)
        }}
        isPending={isModalPending}
        error={modalError}
        editData={editingCampaign}
      />

      {/* Detail drawer */}
      <CampaignDetail campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="mt-4 text-center text-base font-semibold">Excluir campanha?</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Os dados e leads associados não serão excluídos.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
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
