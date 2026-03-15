'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import {
  X,
  Phone,
  Mail,
  DollarSign,
  Star,
  Tag,
  Edit2,
  ExternalLink,
  Calendar,
  MessageSquare,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ApiResponse } from '@crm/shared'

interface LeadDetail {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  source: string
  score: number
  value?: number | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  stage: { id: string; name: string; color: string }
  pipeline: { id: string; name: string }
  tags: Array<{ tag: { id: string; name: string; color: string } }>
  appointments?: Array<{ id: string; title: string; startTime: string }>
}

interface LeadDetailDrawerProps {
  leadId: string | null
  onClose: () => void
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ''}`} />
}

export function LeadDetailDrawer({ leadId, onClose }: LeadDetailDrawerProps) {
  const { api } = useApi()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const isOpen = leadId !== null

  const { data, isLoading } = useQuery({
    queryKey: ['lead-detail', leadId],
    queryFn: () => api<ApiResponse<LeadDetail>>(`/leads/${leadId}`),
    enabled: !!leadId,
  })

  const lead = data?.data

  useEffect(() => {
    if (lead) {
      setEditName(lead.name)
      setEditPhone(lead.phone ?? '')
      setEditEmail(lead.email ?? '')
      setEditValue(lead.value?.toString() ?? '')
      setEditNotes(lead.notes ?? '')
    }
  }, [lead])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api(`/leads/${leadId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', leadId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setEditing(false)
    },
  })

  function handleSave() {
    updateMutation.mutate({
      name: editName,
      phone: editPhone || undefined,
      email: editEmail || undefined,
      value: editValue ? Number(editValue) : undefined,
      notes: editNotes || undefined,
    })
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            {lead && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {lead.name.charAt(0).toUpperCase()}
              </div>
            )}
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <h2 className="text-base font-semibold">{lead?.name}</h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            {lead && (
              <button
                onClick={() => router.push(`/leads/${lead.id}`)}
                className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Abrir página completa"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : lead ? (
            <div className="divide-y divide-border/40">
              {/* Stage + pipeline */}
              <div className="px-5 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pipeline
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{lead.pipeline.name}</span>
                  <span className="text-muted-foreground/40">›</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: lead.stage.color }}
                    />
                    <span className="text-sm font-medium">{lead.stage.name}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {lead.tags.length > 0 && (
                <div className="px-5 py-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tags
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Score */}
              <div className="px-5 py-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Score de Lead
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${lead.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">{lead.score}/100</span>
                </div>
              </div>

              {/* Edit / View fields */}
              <div className="px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Informações
                  </p>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Edit2 className="h-3 w-3" /> Editar
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium">Nome *</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Telefone</label>
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="+55 11 99999-0000"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Valor estimado (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Observações</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                        placeholder="Anotações sobre este lead..."
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="flex-1 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={updateMutation.isPending || !editName.trim()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                          {lead.phone}
                        </a>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <a href={`mailto:${lead.email}`} className="text-primary hover:underline truncate">
                          {lead.email}
                        </a>
                      </div>
                    )}
                    {lead.value != null && lead.value > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(lead.value)}
                        </span>
                      </div>
                    )}
                    {lead.source && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">Origem: <strong>{lead.source}</strong></span>
                      </div>
                    )}
                    {lead.notes && (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide">Observações</p>
                        <p className="whitespace-pre-wrap">{lead.notes}</p>
                      </div>
                    )}
                    {!lead.phone && !lead.email && !lead.value && !lead.notes && (
                      <p className="text-sm text-muted-foreground">Nenhuma informação adicional.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Upcoming appointments for this lead */}
              {lead.appointments && lead.appointments.length > 0 && (
                <div className="px-5 py-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Agendamentos
                    </p>
                  </div>
                  <div className="space-y-2">
                    {lead.appointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                      >
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{apt.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(apt.startTime)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer: dates */}
              <div className="px-5 py-4 text-xs text-muted-foreground/70">
                <div className="flex justify-between">
                  <span>Criado em {formatDateTime(lead.createdAt)}</span>
                </div>
                {lead.updatedAt !== lead.createdAt && (
                  <div className="mt-0.5">
                    Atualizado em {formatDateTime(lead.updatedAt)}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        {lead && !editing && (
          <div className="flex gap-2 border-t border-border/60 p-4">
            <a
              href={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/60 py-2.5 text-sm font-medium transition-colors',
                lead.phone
                  ? 'hover:bg-accent hover:text-foreground'
                  : 'cursor-not-allowed opacity-40',
              )}
              onClick={!lead.phone ? (e) => e.preventDefault() : undefined}
            >
              <MessageSquare className="h-4 w-4 text-green-500" />
              WhatsApp
            </a>
            <button
              onClick={() => router.push(`/leads/${lead.id}`)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Ver Completo
            </button>
          </div>
        )}
      </div>
    </>
  )
}
