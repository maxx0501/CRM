'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ApiResponse } from '@crm/shared'
import {
  Users,
  Plus,
  Search,
  LayoutList,
  LayoutGrid,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRight,
  X,
  Filter,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { LeadModal } from './lead-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  source: string
  score: number
  value?: number | null
  createdAt: string
  stage: { id: string; name: string; color: string }
  tags: Array<{ tag: { id: string; name: string; color: string } }>
}

interface Stage {
  id: string
  name: string
  color: string
}

interface Pipeline {
  id: string
  name: string
  stages: Stage[]
}

type SortField = 'name' | 'createdAt' | 'value' | 'score'
type SortDir = 'asc' | 'desc'
type ViewMode = 'table' | 'grid'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LeadRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  )
}

function LeadCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-6 bg-muted rounded w-1/3" />
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function LeadAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm select-none">
      {initials}
    </div>
  )
}

// ─── Sort header ──────────────────────────────────────────────────────────────

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string
  field: SortField
  current: SortField
  dir: SortDir
  onSort: (f: SortField) => void
}) {
  const isActive = current === field
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {isActive ? (
        dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ stage }: { stage: { name: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: stage.color }}
    >
      {stage.name}
    </span>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  leadName,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean
  leadName: string
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold">Excluir lead</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tem certeza que deseja excluir <strong>{leadName}</strong>? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Bulk Actions Bar ─────────────────────────────────────────────────────────

function BulkActionsBar({
  count,
  onDelete,
  onClear,
  isPending,
}: {
  count: number
  onDelete: () => void
  onClear: () => void
  isPending: boolean
}) {
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
      <span className="text-sm font-medium text-primary">{count} lead{count > 1 ? 's' : ''} selecionado{count > 1 ? 's' : ''}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onDelete}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          {isPending ? 'Excluindo...' : 'Excluir selecionados'}
        </button>
        <button
          onClick={onClear}
          className="rounded-md p-1.5 hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Lead Row (Table) ─────────────────────────────────────────────────────────

function LeadRow({
  lead,
  selected,
  onToggleSelect,
  onDelete,
  onEdit,
}: {
  lead: Lead
  selected: boolean
  onToggleSelect: () => void
  onDelete: (lead: Lead) => void
  onEdit: (lead: Lead) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <tr className={cn('border-b border-border/50 transition-colors hover:bg-muted/30', selected && 'bg-primary/5')}>
      <td className="w-10 px-4 py-3">
        <button onClick={onToggleSelect} className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          {selected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
        </button>
      </td>
      <td className="px-4 py-3">
        <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 group">
          <LeadAvatar name={lead.name} />
          <div>
            <p className="font-medium group-hover:text-primary transition-colors">{lead.name}</p>
            {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{lead.email ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{lead.phone ?? '—'}</td>
      <td className="px-4 py-3">
        <StatusBadge stage={lead.stage} />
      </td>
      <td className="px-4 py-3 text-sm font-medium">
        {lead.value ? formatCurrency(lead.value) : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(lead.score, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{lead.score}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(lead.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="relative flex justify-end">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <ArrowRight className="h-3.5 w-3.5" /> Ver detalhes
                </Link>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => { onEdit(lead); setMenuOpen(false) }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => { onDelete(lead); setMenuOpen(false) }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Lead Card (Grid) ─────────────────────────────────────────────────────────

function LeadCard({
  lead,
  selected,
  onToggleSelect,
  onDelete,
  onEdit,
}: {
  lead: Lead
  selected: boolean
  onToggleSelect: () => void
  onDelete: (lead: Lead) => void
  onEdit: (lead: Lead) => void
}) {
  return (
    <div className={cn('relative rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-border/80', selected && 'border-primary/50 bg-primary/5')}>
      {/* Select checkbox */}
      <button
        onClick={onToggleSelect}
        className="absolute top-3 left-3 text-muted-foreground hover:text-primary transition-colors"
      >
        {selected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
      </button>

      {/* Action menu */}
      <LeadCardMenu lead={lead} onEdit={onEdit} onDelete={onDelete} />

      {/* Avatar + Name */}
      <Link href={`/leads/${lead.id}`} className="mt-2 flex flex-col items-center text-center group">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg select-none">
          {lead.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
        </div>
        <p className="mt-2 font-semibold group-hover:text-primary transition-colors">{lead.name}</p>
        {lead.email && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">{lead.email}</p>}
        {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
      </Link>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {lead.tags.slice(0, 3).map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <StatusBadge stage={lead.stage} />
        {lead.value && (
          <span className="text-sm font-semibold text-foreground">{formatCurrency(lead.value)}</span>
        )}
      </div>

      {/* Score bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(lead.score, 100)}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{lead.score} pts</span>
      </div>
    </div>
  )
}

function LeadCardMenu({
  lead,
  onEdit,
  onDelete,
}: {
  lead: Lead
  onEdit: (l: Lead) => void
  onDelete: (l: Lead) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute top-3 right-3">
      <button onClick={() => setOpen(!open)} className="rounded-md p-1 hover:bg-muted transition-colors">
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 w-36 rounded-lg border border-border bg-card py-1 shadow-lg text-sm">
            <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted" onClick={() => { onEdit(lead); setOpen(false) }}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10" onClick={() => { onDelete(lead); setOpen(false) }}>
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  perPage,
  total,
  onPage,
  onPerPage,
}: {
  page: number
  totalPages: number
  perPage: number
  total: number
  onPage: (p: number) => void
  onPerPage: (n: number) => void
}) {
  const pages = useMemo(() => {
    const arr: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i)
    } else {
      arr.push(1)
      if (page > 3) arr.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i)
      if (page < totalPages - 2) arr.push('...')
      arr.push(totalPages)
    }
    return arr
  }, [page, totalPages])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/50 pt-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Exibindo</span>
        <select
          value={perPage}
          onChange={(e) => onPerPage(Number(e.target.value))}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>de {total} leads</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="rounded-md px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-40 transition-colors"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-muted-foreground">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={cn(
                'min-w-[32px] rounded-md px-2.5 py-1.5 text-sm transition-colors',
                p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="rounded-md px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-40 transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onCreate }: { hasFilters: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Users className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold">
          {hasFilters ? 'Nenhum lead encontrado' : 'Nenhum lead cadastrado ainda'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters
            ? 'Tente ajustar os filtros para encontrar o que procura.'
            : 'Comece adicionando seu primeiro lead para gerenciar seu pipeline.'}
        </p>
      </div>
      {!hasFilters && (
        <button
          onClick={onCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Adicionar primeiro lead
        </button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { api } = useApi()
  const queryClient = useQueryClient()

  // ── View state ──
  const [view, setView] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)
  const [editTarget, setEditTarget] = useState<Lead | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // ── Queries ──
  const queryParams = useMemo(() => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (stageFilter) p.set('stageId', stageFilter)
    p.set('sort', sortField)
    p.set('order', sortDir)
    p.set('page', String(page))
    p.set('limit', String(perPage))
    return p.toString()
  }, [search, stageFilter, sortField, sortDir, page, perPage])

  const { data, isLoading } = useQuery({
    queryKey: ['leads', queryParams],
    queryFn: () => api<ApiResponse<{ leads: Lead[]; total: number; page: number; totalPages: number }>>(`/leads?${queryParams}`),
    placeholderData: (prev) => prev,
  })

  const { data: pipelineData } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api<ApiResponse<Pipeline[]>>('/pipelines'),
  })

  // ── Derived data ──
  const leads = data?.data?.leads ?? (Array.isArray(data?.data) ? (data?.data as unknown as Lead[]) : [])
  const total = data?.data?.total ?? leads.length
  const totalPages = data?.data?.totalPages ?? (Math.ceil(total / perPage) || 1)
  const allStages = pipelineData?.data?.flatMap((p) => p.stages) ?? []
  const hasFilters = !!(search || stageFilter)

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setDeleteTarget(null)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api(`/leads/${id}`, { method: 'DELETE' })))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setSelectedIds(new Set())
    },
  })

  // ── Handlers ──
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }, [sortField])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(leads.map((l) => l.id)))
  }, [leads, selectedIds.size])

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} lead${total > 1 ? 's' : ''} cadastrado${total > 1 ? 's' : ''}` : 'Gerencie seus contatos e prospects'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Lead
        </button>
      </div>

      {/* ── Filters + View Toggle ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nome, email ou telefone..."
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Stage filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1) }}
            className="h-10 appearance-none rounded-lg border border-input bg-background pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          >
            <option value="">Todas as etapas</option>
            {allStages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-input bg-background p-1 gap-0.5">
          <button
            onClick={() => setView('table')}
            className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all', view === 'table' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() => setView('grid')}
            className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all', view === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Cards</span>
          </button>
        </div>
      </div>

      {/* ── Bulk Actions ── */}
      <BulkActionsBar
        count={selectedIds.size}
        onDelete={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
        onClear={() => setSelectedIds(new Set())}
        isPending={bulkDeleteMutation.isPending}
      />

      {/* ── Content ── */}
      {isLoading ? (
        view === 'table' ? (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <tbody>
                {[...Array(8)].map((_, i) => <LeadRowSkeleton key={i} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <LeadCardSkeleton key={i} />)}
          </div>
        )
      ) : leads.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onCreate={() => setShowCreateModal(true)} />
      ) : view === 'table' ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="w-10 px-4 py-3 text-left">
                    <button onClick={toggleSelectAll} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                      {selectedIds.size === leads.length && leads.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortHeader label="Nome" field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Telefone</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etapa</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">
                    <SortHeader label="Valor" field="value" current={sortField} dir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <SortHeader label="Score" field="score" current={sortField} dir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell">
                    <SortHeader label="Criado em" field="createdAt" current={sortField} dir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {leads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    selected={selectedIds.has(lead.id)}
                    onToggleSelect={() => toggleSelect(lead.id)}
                    onDelete={setDeleteTarget}
                    onEdit={setEditTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              selected={selectedIds.has(lead.id)}
              onToggleSelect={() => toggleSelect(lead.id)}
              onDelete={setDeleteTarget}
              onEdit={setEditTarget}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!isLoading && leads.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          perPage={perPage}
          total={total}
          onPage={(p) => { setPage(p); setSelectedIds(new Set()) }}
          onPerPage={(n) => { setPerPage(n); setPage(1) }}
        />
      )}

      {/* ── Modals ── */}
      <LeadModal
        open={showCreateModal || !!editTarget}
        lead={editTarget}
        allStages={allStages}
        onClose={() => { setShowCreateModal(false); setEditTarget(null) }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
        api={api}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        leadName={deleteTarget?.name ?? ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
