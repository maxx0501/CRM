'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { KanbanBoard, type KanbanStage, type KanbanLead } from '@/components/kanban/kanban-board'
import { LeadDetailDrawer } from '@/components/leads/lead-detail-drawer'
import { useState, useEffect, useRef } from 'react'
import type { ApiResponse } from '@crm/shared'
import { Plus, X, ChevronDown, Kanban, Loader2, Settings } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

interface PipelineData {
  id: string
  name: string
  stages: KanbanStage[]
}

interface PipelineListItem {
  id: string
  name: string
  _count?: { stages?: number; leads?: number }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ''}`} />
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-hidden pb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-72 min-w-[288px] rounded-xl border border-border/60 bg-muted/20">
          <div className="rounded-t-xl border-b border-border/60 bg-muted/40 px-3 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: i % 2 === 0 ? 3 : 2 }).map((_, j) => (
              <div key={j} className="rounded-lg border border-border/60 bg-card p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <Skeleton className="mt-3 h-3 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Pipeline selector ─────────────────────────────────────────────────────

interface PipelineSelectorProps {
  pipelines: PipelineListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreateNew: () => void
}

function PipelineSelector({ pipelines, selectedId, onSelect, onCreateNew }: PipelineSelectorProps) {
  const [open, setOpen] = useState(false)
  const selected = pipelines.find((p) => p.id === selectedId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm font-medium shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
      >
        <Kanban className="h-4 w-4 text-primary" />
        <span className="max-w-[200px] truncate">{selected?.name ?? 'Selecionar Pipeline'}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border/60 bg-card shadow-lg">
            <div className="p-1">
              {pipelines.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelect(p.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    p.id === selectedId
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-foreground hover:bg-accent',
                  )}
                >
                  <Kanban className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  {p._count && (
                    <span className="text-xs text-muted-foreground">
                      {p._count.leads ?? 0} leads
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-border/60 p-1">
              <button
                onClick={() => {
                  onCreateNew()
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar novo pipeline
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Pipeline stats bar ────────────────────────────────────────────────────

function PipelineStats({ stages }: { stages: KanbanStage[] }) {
  const totalLeads = stages.reduce((s, st) => s + st.leads.length, 0)
  const totalValue = stages.reduce(
    (s, st) => s + st.leads.reduce((sv, l) => sv + (l.value ?? 0), 0),
    0,
  )
  const wonStage = stages.find((s) => s.isWonStage)
  const wonCount = wonStage?.leads.length ?? 0
  const convRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : '0.0'

  if (totalLeads === 0) return null

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-border/60 bg-card px-4 py-3 text-sm shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-semibold">{totalLeads} leads</span>
      </div>
      {totalValue > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Valor em pipeline:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalValue)}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Taxa de conversão:</span>
        <span className="font-semibold text-primary">{convRate}%</span>
      </div>
      {wonCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Ganhos:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{wonCount}</span>
        </div>
      )}
    </div>
  )
}

// ─── Create Pipeline Modal ─────────────────────────────────────────────────

interface CreatePipelineModalProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, stages: string[]) => void
  isPending: boolean
}

const TEMPLATES = [
  { label: 'Padrão', stages: ['Novo', 'Qualificado', 'Proposta', 'Ganho', 'Perdido'] },
  { label: 'Simples', stages: ['Contato', 'Proposta', 'Fechado'] },
  { label: 'Completo', stages: ['Novo', 'Qualificado', 'Proposta', 'Negociação', 'Ganho', 'Perdido'] },
]

function CreatePipelineModal({ open, onClose, onCreate, isPending }: CreatePipelineModalProps) {
  const [name, setName] = useState('')
  const [stages, setStages] = useState<string[]>(['Novo', 'Qualificado', 'Proposta', 'Ganho'])
  const [stageInput, setStageInput] = useState('')

  function addStage() {
    const trimmed = stageInput.trim()
    if (trimmed && !stages.includes(trimmed)) {
      setStages((prev) => [...prev, trimmed])
      setStageInput('')
    }
  }

  function removeStage(idx: number) {
    setStages((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || stages.length === 0) return
    onCreate(name.trim(), stages)
  }

  useEffect(() => {
    if (!open) {
      setName('')
      setStages(['Novo', 'Qualificado', 'Proposta', 'Ganho'])
      setStageInput('')
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Criar Pipeline</h2>
            <p className="text-xs text-muted-foreground">Configure o funil de vendas</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome do Pipeline *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ex: Vendas B2B, Consultoria..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Etapas do Funil</label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => setStages(tmpl.stages)}
                  className="rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            <div className="flex min-h-[40px] flex-wrap gap-1.5">
              {stages.map((stage, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {stage}
                  <button
                    type="button"
                    onClick={() => removeStage(idx)}
                    className="ml-0.5 text-primary/60 hover:text-primary"
                    aria-label={`Remover etapa ${stage}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={stageInput}
                onChange={(e) => setStageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addStage()
                  }
                }}
                className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Adicionar etapa..."
              />
              <button
                type="button"
                onClick={addStage}
                disabled={!stageInput.trim()}
                className="flex h-9 items-center gap-1 rounded-md border border-border/60 px-3 text-sm transition-colors hover:bg-accent disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border/60 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || stages.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Criar Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Lead Modal ────────────────────────────────────────────────────────

interface AddLeadModalProps {
  open: boolean
  stageId: string | null
  stageName?: string
  onClose: () => void
  onSubmit: (data: { name: string; phone?: string; email?: string; value?: number; stageId: string }) => void
  isPending: boolean
  error?: string
}

function AddLeadModal({
  open,
  stageId,
  stageName,
  onClose,
  onSubmit,
  isPending,
  error,
}: AddLeadModalProps) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (open) formRef.current?.reset()
  }, [open])

  if (!open || !stageId) return null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!stageId) return
    const fd = new FormData(e.currentTarget)
    onSubmit({
      name: fd.get('name') as string,
      phone: (fd.get('phone') as string) || undefined,
      email: (fd.get('email') as string) || undefined,
      value: fd.get('value') ? Number(fd.get('value')) : undefined,
      stageId,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Novo Lead</h2>
            {stageName && (
              <p className="text-xs text-muted-foreground">
                Etapa: <strong>{stageName}</strong>
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome *</label>
            <input
              name="name"
              required
              autoFocus
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Nome do lead"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefone</label>
              <input
                name="phone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="+55 11 99999-0000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor (R$)</label>
              <input
                name="value"
                type="number"
                step="0.01"
                min="0"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border/60 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Criar Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyPipelineState({ onCreatePipeline }: { onCreatePipeline: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Kanban className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Nenhum pipeline ainda</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Crie seu primeiro pipeline para começar a gerenciar seus leads em um funil de vendas visual.
        </p>
      </div>
      <button
        onClick={onCreatePipeline}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
      >
        <Plus className="h-4 w-4" />
        Criar meu primeiro pipeline
      </button>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { api } = useApi()
  const queryClient = useQueryClient()

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [showCreatePipeline, setShowCreatePipeline] = useState(false)
  const [showAddLead, setShowAddLead] = useState(false)
  const [addToStageId, setAddToStageId] = useState<string | null>(null)
  const [addLeadError, setAddLeadError] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  // Local optimistic stages for smooth drag-and-drop
  const [optimisticStages, setOptimisticStages] = useState<KanbanStage[] | null>(null)

  // ── Fetch pipeline list ────────────────────────────────────────────────────
  const { data: pipelinesData, isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api<ApiResponse<PipelineListItem[]>>('/pipelines'),
  })

  const pipelines = pipelinesData?.data ?? []

  // Auto-select first pipeline when list loads
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id)
    }
  }, [pipelines, selectedPipelineId])

  const effectivePipelineId = selectedPipelineId ?? pipelines[0]?.id ?? null

  // ── Fetch selected pipeline with stages + leads ────────────────────────────
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ['pipeline', effectivePipelineId],
    queryFn: () =>
      api<ApiResponse<PipelineData>>(
        effectivePipelineId ? `/pipelines/${effectivePipelineId}` : '/pipelines/default',
      ),
    enabled: !!effectivePipelineId || !pipelinesLoading,
  })

  const pipeline = pipelineData?.data
  const rawStages: KanbanStage[] = pipeline?.stages ?? []
  const stages: KanbanStage[] = optimisticStages ?? rawStages

  // Clear optimistic when server data updates (use pipelineData as dep to avoid stale ref issues)
  useEffect(() => {
    setOptimisticStages(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineData])

  const isLoadingPipeline = pipelineLoading && !pipeline

  // ── Mutations ──────────────────────────────────────────────────────────────

  const moveMutation = useMutation({
    mutationFn: ({
      leadId,
      stageId,
      position,
    }: {
      leadId: string
      stageId: string
      position: number
    }) =>
      api(`/leads/${leadId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId, position }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', effectivePipelineId] })
    },
    onError: () => {
      // Rollback optimistic on error
      setOptimisticStages(null)
    },
  })

  const createLeadMutation = useMutation({
    mutationFn: (payload: {
      name: string
      phone?: string
      email?: string
      value?: number
      stageId: string
    }) => api('/leads', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', effectivePipelineId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setShowAddLead(false)
      setAddToStageId(null)
      setAddLeadError('')
    },
    onError: (err: Error) => {
      setAddLeadError(err.message || 'Erro ao criar lead')
    },
  })

  const createPipelineMutation = useMutation({
    mutationFn: (payload: { name: string; stages: string[] }) =>
      api('/pipelines', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (d: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      setShowCreatePipeline(false)
      const resp = d as ApiResponse<{ id: string }>
      if (resp?.data?.id) {
        setSelectedPipelineId(resp.data.id)
        setOptimisticStages(null)
      }
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleMoveLead(leadId: string, stageId: string, position: number) {
    // Apply optimistic update immediately
    setOptimisticStages((prev) => {
      const base = prev ?? rawStages
      const lead = base.flatMap((s) => s.leads).find((l) => l.id === leadId)
      if (!lead) return base

      const withoutLead = base.map((s) => ({
        ...s,
        leads: s.leads.filter((l) => l.id !== leadId),
      }))

      return withoutLead.map((s) => {
        if (s.id !== stageId) return s
        const updatedLead: KanbanLead = { ...lead, stageId }
        const newLeads = [...s.leads]
        newLeads.splice(position, 0, updatedLead)
        return { ...s, leads: newLeads }
      })
    })

    moveMutation.mutate({ leadId, stageId, position })
  }

  function handleAddLead(stageId: string) {
    setAddToStageId(stageId)
    setAddLeadError('')
    setShowAddLead(true)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const addToStageName = stages.find((s) => s.id === addToStageId)?.name
  const noPipelines = !pipelinesLoading && pipelines.length === 0 && !pipeline

  // ─────────────────────────────────────────────────────────────────────────

  if (pipelinesLoading && !pipeline) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <KanbanSkeleton />
      </div>
    )
  }

  if (noPipelines) {
    return (
      <>
        <EmptyPipelineState onCreatePipeline={() => setShowCreatePipeline(true)} />
        <CreatePipelineModal
          open={showCreatePipeline}
          onClose={() => setShowCreatePipeline(false)}
          onCreate={(name, stageNames) =>
            createPipelineMutation.mutate({ name, stages: stageNames })
          }
          isPending={createPipelineMutation.isPending}
        />
      </>
    )
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {pipelines.length > 0 && (
            <PipelineSelector
              pipelines={pipelines}
              selectedId={effectivePipelineId}
              onSelect={(id) => {
                setSelectedPipelineId(id)
                setOptimisticStages(null)
              }}
              onCreateNew={() => setShowCreatePipeline(true)}
            />
          )}
          {pipeline && (
            <span className="hidden text-sm text-muted-foreground sm:block">
              {stages.length} etapa{stages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddLead(stages[0]?.id ?? '')}
            disabled={stages.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Pipeline stats */}
      {stages.length > 0 && <PipelineStats stages={stages} />}

      {/* Kanban board */}
      {isLoadingPipeline ? (
        <KanbanSkeleton />
      ) : stages.length === 0 && pipeline ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Pipeline sem etapas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Este pipeline não tem etapas configuradas ainda.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <KanbanBoard
            stages={stages}
            onMoveLead={handleMoveLead}
            onLeadClick={(id) => setSelectedLeadId(id)}
            onAddLead={handleAddLead}
          />
        </div>
      )}

      {/* Modals */}
      <CreatePipelineModal
        open={showCreatePipeline}
        onClose={() => setShowCreatePipeline(false)}
        onCreate={(name, stageNames) =>
          createPipelineMutation.mutate({ name, stages: stageNames })
        }
        isPending={createPipelineMutation.isPending}
      />

      <AddLeadModal
        open={showAddLead}
        stageId={addToStageId}
        stageName={addToStageName}
        onClose={() => {
          setShowAddLead(false)
          setAddLeadError('')
        }}
        onSubmit={(data) => createLeadMutation.mutate(data)}
        isPending={createLeadMutation.isPending}
        error={addLeadError}
      />

      {/* Lead detail slide-over */}
      <LeadDetailDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  )
}
