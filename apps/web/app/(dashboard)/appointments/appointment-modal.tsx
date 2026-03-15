'use client'

import { useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { X, Search } from 'lucide-react'
import { useEffect, useRef, useState, useMemo } from 'react'
import type { Appointment, Lead } from './page'

interface AppointmentModalProps {
  open: boolean
  appointment?: Appointment | null
  leads: Lead[]
  onClose: () => void
  onSuccess: () => void
  api: <T>(endpoint: string, options?: RequestInit) => Promise<T>
}

const TYPE_OPTIONS = [
  { value: 'MEETING', label: 'Reunião' },
  { value: 'CONSULTATION', label: 'Consulta' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'DEMO', label: 'Demo' },
  { value: 'OTHER', label: 'Outro' },
]

// ─── Lead Search Input ────────────────────────────────────────────────────────

function LeadSearchInput({
  leads,
  defaultLeadId,
  name,
}: {
  leads: Lead[]
  defaultLeadId?: string | null
  name: string
}) {
  const defaultLead = leads.find((l) => l.id === defaultLeadId)
  const [query, setQuery] = useState(defaultLead?.name ?? '')
  const [selected, setSelected] = useState<Lead | null>(defaultLead ?? null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query || selected?.name === query) return leads.slice(0, 10)
    return leads.filter((l) => l.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
  }, [leads, query, selected])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (!selected) setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selected])

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected?.id ?? ''} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar lead..."
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
        />
        {selected && (
          <button
            type="button"
            onClick={() => { setSelected(null); setQuery(''); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-52 overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg">
          {filtered.map((lead) => (
            <button
              key={lead.id}
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => {
                setSelected(lead)
                setQuery(lead.name)
                setOpen(false)
              }}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {lead.name[0].toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <p className="font-medium truncate">{lead.name}</p>
                {lead.email && <p className="text-xs text-muted-foreground truncate">{lead.email}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Local datetime helpers ───────────────────────────────────────────────────

function toLocalDateTimeInput(isoStr: string): string {
  const d = new Date(isoStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDefaultStart(): string {
  const d = new Date()
  d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDefaultEnd(start: string): string {
  const d = new Date(start)
  d.setHours(d.getHours() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function AppointmentModal({ open, appointment, leads, onClose, onSuccess, api }: AppointmentModalProps) {
  const isEditing = !!appointment
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [startValue, setStartValue] = useState(getDefaultStart())

  useEffect(() => {
    if (open) {
      setError('')
      const newStart = appointment?.startsAt ? toLocalDateTimeInput(appointment.startsAt) : getDefaultStart()
      setStartValue(newStart)
    }
  }, [open, appointment?.id])

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (isEditing) {
        return api(`/appointments/${appointment.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      }
      return api('/appointments', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      onSuccess()
      onClose()
      setError('')
    },
    onError: (err: Error) => {
      setError(err.message || 'Erro ao salvar agendamento')
    },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    const title = (fd.get('title') as string)?.trim()
    if (!title) { setError('O título é obrigatório'); return }

    const startsAtRaw = fd.get('startsAt') as string
    const endsAtRaw = fd.get('endsAt') as string
    if (!startsAtRaw) { setError('A data de início é obrigatória'); return }
    if (!endsAtRaw) { setError('A data de término é obrigatória'); return }

    const startsAt = new Date(startsAtRaw)
    const endsAt = new Date(endsAtRaw)
    if (endsAt <= startsAt) { setError('A data de término deve ser após o início'); return }

    const payload: Record<string, unknown> = {
      title,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    }

    const leadId = fd.get('leadId') as string
    if (leadId) payload.leadId = leadId

    const type = fd.get('type') as string
    if (type) payload.type = type

    const notes = (fd.get('notes') as string)?.trim()
    if (notes) payload.notes = notes

    mutation.mutate(payload)
  }

  if (!open) return null

  const defaultEnd = appointment?.endsAt
    ? toLocalDateTimeInput(appointment.endsAt)
    : getDefaultEnd(startValue)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold">{isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Título */}
            <div className="space-y-1.5">
              <label htmlFor="apt-title" className="text-sm font-medium">
                Título <span className="text-destructive">*</span>
              </label>
              <input
                id="apt-title"
                name="title"
                required
                defaultValue={appointment?.title ?? ''}
                placeholder="Ex: Reunião de apresentação"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
              />
            </div>

            {/* Lead */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Lead relacionado</label>
              <LeadSearchInput
                leads={leads}
                defaultLeadId={appointment?.lead?.id}
                name="leadId"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <label htmlFor="apt-type" className="text-sm font-medium">Tipo</label>
              <select
                id="apt-type"
                name="type"
                defaultValue={appointment?.type ?? ''}
                className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">Selecione o tipo...</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Início + Fim */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="apt-start" className="text-sm font-medium">
                  Início <span className="text-destructive">*</span>
                </label>
                <input
                  id="apt-start"
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={appointment?.startsAt ? toLocalDateTimeInput(appointment.startsAt) : startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="apt-end" className="text-sm font-medium">
                  Término <span className="text-destructive">*</span>
                </label>
                <input
                  id="apt-end"
                  name="endsAt"
                  type="datetime-local"
                  required
                  defaultValue={defaultEnd}
                  min={startValue}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <label htmlFor="apt-notes" className="text-sm font-medium">Notas</label>
              <textarea
                id="apt-notes"
                name="notes"
                rows={3}
                defaultValue={appointment?.notes ?? ''}
                placeholder="Informações adicionais sobre o agendamento..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border/60 px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-medium text-primary-foreground transition-colors',
                mutation.isPending ? 'bg-primary/70 cursor-not-allowed' : 'bg-primary hover:bg-primary/90',
              )}
            >
              {mutation.isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
