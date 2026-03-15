'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import type { ApiResponse } from '@crm/shared'
import { useState } from 'react'

interface Workspace {
  id: string
  name: string
  slug: string
  niche?: string | null
  timezone: string
  whatsappApiUrl?: string | null
  whatsappApiKey?: string | null
}

export default function SettingsPage() {
  const { api } = useApi()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-settings'],
    queryFn: () => api<ApiResponse<Workspace>>('/workspaces/current'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api('/workspaces/current', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    updateMutation.mutate({
      name: fd.get('name'),
      niche: fd.get('niche') || undefined,
      whatsappApiUrl: fd.get('whatsappApiUrl') || undefined,
      whatsappApiKey: fd.get('whatsappApiKey') || undefined,
    })
  }

  const ws = data?.data

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {isLoading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold">Workspace</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <input name="name" defaultValue={ws?.name} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <input disabled value={ws?.slug} className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nicho</label>
              <select name="niche" defaultValue={ws?.niche || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                <option value="physiotherapy">Fisioterapia</option>
                <option value="psychology">Psicologia</option>
                <option value="personal_trainer">Personal Trainer</option>
                <option value="nutrition">Nutrição</option>
                <option value="dentistry">Odontologia</option>
                <option value="aesthetics">Estética</option>
                <option value="coaching">Coaching</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold">WhatsApp API</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">API URL</label>
              <input name="whatsappApiUrl" defaultValue={ws?.whatsappApiUrl || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="https://api.example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <input name="whatsappApiKey" type="password" defaultValue={ws?.whatsappApiKey || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={updateMutation.isPending} className="rounded-md bg-primary px-6 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            {saved && <span className="text-sm text-green-600">Salvo com sucesso!</span>}
          </div>
        </form>
      )}
    </div>
  )
}
