'use client'

import { useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Lead } from './page'

interface Stage {
  id: string
  name: string
  color: string
}

interface LeadModalProps {
  open: boolean
  lead?: Lead | null
  allStages: Stage[]
  onClose: () => void
  onSuccess: () => void
  api: <T>(endpoint: string, options?: RequestInit) => Promise<T>
}

export function LeadModal({ open, lead, allStages, onClose, onSuccess, api }: LeadModalProps) {
  const isEditing = !!lead
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setError('')
      setTimeout(() => formRef.current?.reset(), 50)
    }
  }, [open, lead?.id])

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (isEditing) {
        return api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      }
      return api('/leads', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      onSuccess()
      onClose()
      setError('')
    },
    onError: (err: Error) => {
      setError(err.message || 'Erro ao salvar lead')
    },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    const payload: Record<string, unknown> = {}

    const name = fd.get('name') as string
    if (!name?.trim()) { setError('O nome é obrigatório'); return }
    payload.name = name.trim()

    const stageId = fd.get('stageId') as string
    if (!stageId) { setError('Selecione uma etapa'); return }
    payload.stageId = stageId

    const email = (fd.get('email') as string)?.trim()
    if (email) payload.email = email

    const phone = (fd.get('phone') as string)?.trim()
    if (phone) payload.phone = phone

    const value = fd.get('value') as string
    if (value) payload.value = Number(value)

    const notes = (fd.get('notes') as string)?.trim()
    if (notes) payload.notes = notes

    mutation.mutate(payload)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold">{isEditing ? 'Editar Lead' : 'Novo Lead'}</h2>
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

            {/* Nome */}
            <div className="space-y-1.5">
              <label htmlFor="lead-name" className="text-sm font-medium">
                Nome <span className="text-destructive">*</span>
              </label>
              <input
                id="lead-name"
                name="name"
                required
                defaultValue={lead?.name ?? ''}
                placeholder="Nome completo do lead"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
              />
            </div>

            {/* Etapa */}
            <div className="space-y-1.5">
              <label htmlFor="lead-stage" className="text-sm font-medium">
                Etapa do Pipeline <span className="text-destructive">*</span>
              </label>
              <select
                id="lead-stage"
                name="stageId"
                required
                defaultValue={lead?.stage?.id ?? ''}
                className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
              >
                <option value="">Selecione uma etapa...</option>
                {allStages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Email + Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="lead-email" className="text-sm font-medium">Email</label>
                <input
                  id="lead-email"
                  name="email"
                  type="email"
                  defaultValue={lead?.email ?? ''}
                  placeholder="email@exemplo.com"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lead-phone" className="text-sm font-medium">Telefone</label>
                <input
                  id="lead-phone"
                  name="phone"
                  type="tel"
                  defaultValue={lead?.phone ?? ''}
                  placeholder="+55 11 99999-9999"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <label htmlFor="lead-value" className="text-sm font-medium">Valor Estimado (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <input
                  id="lead-value"
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={lead?.value ?? ''}
                  placeholder="0,00"
                  className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <label htmlFor="lead-notes" className="text-sm font-medium">Notas</label>
              <textarea
                id="lead-notes"
                name="notes"
                rows={3}
                placeholder="Informações adicionais sobre o lead..."
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
              {mutation.isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
