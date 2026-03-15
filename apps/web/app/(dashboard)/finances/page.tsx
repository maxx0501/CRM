'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ApiResponse } from '@crm/shared'
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt,
  BarChart3,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { useState, useMemo } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE'
  description: string
  amount: number
  category?: string | null
  method: string
  isPaid: boolean
  dueDate?: string | null
  notes?: string | null
  lead?: { id: string; name: string } | null
  createdAt?: string
}

interface Summary {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount?: number
}

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE'
type SortField = 'dueDate' | 'amount' | 'createdAt'
type SortDir = 'asc' | 'desc'

const CATEGORIES = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'produto', label: 'Produto' },
  { value: 'servico', label: 'Serviço' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'outro', label: 'Outro' },
]

const METHODS: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  CASH: 'Dinheiro',
  BANK_TRANSFER: 'Transferência',
}

const PAGE_SIZE = 10

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/60',
        className,
      )}
    />
  )
}

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary, isLoading }: { summary?: Summary; isLoading: boolean }) {
  const cards = [
    {
      label: 'Receita Total',
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-100 dark:border-emerald-900/40',
      trend: <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />,
    },
    {
      label: 'Despesa Total',
      value: summary?.totalExpense ?? 0,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-100 dark:border-red-900/40',
      trend: <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />,
    },
    {
      label: 'Saldo',
      value: summary?.balance ?? 0,
      icon: Wallet,
      color: (summary?.balance ?? 0) >= 0 ? 'text-primary' : 'text-red-500',
      bg: 'bg-primary/5',
      border: 'border-primary/10',
      trend: null,
    },
    {
      label: 'Transações',
      value: null,
      count: summary?.transactionCount ?? 0,
      icon: BarChart3,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      border: 'border-violet-100 dark:border-violet-900/40',
      trend: null,
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={cn(
              'rounded-xl border bg-card p-5 transition-shadow hover:shadow-md',
              card.border,
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', card.bg)}>
                <Icon className={cn('h-4.5 w-4.5', card.color)} />
              </div>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <p className={cn('text-2xl font-bold tracking-tight', card.color)}>
                {card.value !== null ? formatCurrency(card.value) : card.count}
              </p>
              {card.trend && <div className="mb-0.5">{card.trend}</div>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.label === 'Saldo'
                ? (summary?.balance ?? 0) >= 0
                  ? 'Positivo este mês'
                  : 'Negativo este mês'
                : card.label === 'Transações'
                  ? 'este mês'
                  : 'este mês'}
            </p>
          </div>
        )
      })}
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
  editData?: Transaction | null
}

function TransactionModal({ open, onClose, onSubmit, isPending, error, editData }: ModalProps) {
  if (!open) return null

  const isEdit = !!editData

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSubmit({
      type: fd.get('type'),
      description: fd.get('description'),
      amount: Number(fd.get('amount')),
      category: fd.get('category') || undefined,
      method: fd.get('method') || 'PIX',
      isPaid: fd.get('isPaid') === 'on',
      dueDate: fd.get('dueDate') || undefined,
      notes: fd.get('notes') || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">{isEdit ? 'Editar Transação' : 'Nova Transação'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Atualize os dados da transação' : 'Registre uma receita ou despesa'}
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

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-3">
            {(['INCOME', 'EXPENSE'] as const).map((t) => (
              <label
                key={t}
                className="relative flex cursor-pointer"
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  defaultChecked={editData ? editData.type === t : t === 'INCOME'}
                  className="peer sr-only"
                />
                <div
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
                    'peer-checked:border-primary peer-checked:bg-primary/5',
                    'border-border hover:border-muted-foreground/30',
                    t === 'INCOME'
                      ? 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 dark:peer-checked:bg-emerald-950/40 dark:peer-checked:text-emerald-400'
                      : 'peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700 dark:peer-checked:bg-red-950/40 dark:peer-checked:text-red-400',
                  )}
                >
                  {t === 'INCOME' ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {t === 'INCOME' ? 'Receita' : 'Despesa'}
                </div>
              </label>
            ))}
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição *</label>
            <input
              name="description"
              required
              defaultValue={editData?.description}
              placeholder="Ex: Consultoria de marketing"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Valor e Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={editData?.amount}
                  placeholder="0,00"
                  className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoria</label>
              <select
                name="category"
                defaultValue={editData?.category ?? ''}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecione...</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Método e Data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Método</label>
              <select
                name="method"
                defaultValue={editData?.method ?? 'PIX'}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(METHODS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data de Vencimento</label>
              <input
                name="dueDate"
                type="date"
                defaultValue={editData?.dueDate?.split('T')[0]}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editData?.notes ?? ''}
              placeholder="Observações adicionais..."
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Pago */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className="relative">
              <input
                name="isPaid"
                type="checkbox"
                defaultChecked={editData?.isPaid}
                className="peer sr-only"
              />
              <div className="h-5 w-5 rounded border-2 border-border transition-colors peer-checked:border-emerald-500 peer-checked:bg-emerald-500 group-hover:border-muted-foreground flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 absolute" />
              </div>
            </div>
            <span className="text-sm font-medium">Já está pago / recebido</span>
          </label>

          {/* Actions */}
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
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const { api } = useApi()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [modalError, setModalError] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('ALL')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // ── Queries ──
  const { data: txData, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api<ApiResponse<Transaction[]>>('/finances'),
  })

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['transactions-summary'],
    queryFn: () => api<ApiResponse<Summary>>('/finances/summary'),
  })

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api('/finances', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] })
      setShowModal(false)
      setModalError('')
    },
    onError: (err: Error) => setModalError(err.message || 'Erro ao criar transação'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api(`/finances/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] })
      setEditingTx(null)
      setModalError('')
    },
    onError: (err: Error) => setModalError(err.message || 'Erro ao atualizar transação'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/finances/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] })
      setDeleteId(null)
    },
  })

  // ── Filtered / sorted data ──
  const filtered = useMemo(() => {
    let list = txData?.data ?? []
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.lead?.name.toLowerCase().includes(q),
      )
    }
    if (filterType !== 'ALL') list = list.filter((t) => t.type === filterType)
    if (filterCategory) list = list.filter((t) => t.category === filterCategory)

    list = [...list].sort((a, b) => {
      let av: number, bv: number
      if (sortField === 'amount') {
        av = a.amount; bv = b.amount
      } else {
        av = new Date(a.dueDate ?? a.createdAt ?? 0).getTime()
        bv = new Date(b.dueDate ?? b.createdAt ?? 0).getTime()
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [txData, search, filterType, filterCategory, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Category stats ──
  const categoryStats = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}
    for (const tx of txData?.data ?? []) {
      const cat = tx.category || 'outro'
      if (!map[cat]) map[cat] = { income: 0, expense: 0 }
      if (tx.type === 'INCOME') map[cat].income += tx.amount
      else map[cat].expense += tx.amount
    }
    return Object.entries(map).sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
  }, [txData])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const isModalPending = createMutation.isPending || updateMutation.isPending
  const isEmpty = !isLoading && (txData?.data ?? []).length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Controle suas receitas e despesas
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setModalError('') }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Transação
        </button>
      </div>

      {/* Summary */}
      <SummaryCards summary={summaryData?.data} isLoading={summaryLoading} />

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhuma transação ainda</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Comece registrando sua primeira receita ou despesa para acompanhar seu fluxo financeiro.
          </p>
          <button
            onClick={() => { setShowModal(true); setModalError('') }}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Registrar primeira transação
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
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar transações..."
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(['ALL', 'INCOME', 'EXPENSE'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilterType(f); setPage(1) }}
                  className={cn(
                    'whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    filterType === f
                      ? f === 'INCOME'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : f === 'EXPENSE'
                          ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {f === 'ALL' ? 'Todos' : f === 'INCOME' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Categoria</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Lead</th>
                    <th
                      className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort('amount')}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Valor
                        <Filter className="h-3 w-3" />
                      </span>
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none hidden sm:table-cell"
                      onClick={() => toggleSort('dueDate')}
                    >
                      <span className="flex items-center gap-1">
                        Data
                        <Filter className="h-3 w-3" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                          <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-14 rounded-full" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-7 w-16" /></td>
                        </tr>
                      ))
                    : paginated.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors group"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">{tx.description}</p>
                            {tx.notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.notes}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                tx.type === 'INCOME'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
                              )}
                            >
                              {tx.type === 'INCOME' ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {tx.type === 'INCOME' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-muted-foreground capitalize">
                              {tx.category
                                ? CATEGORIES.find((c) => c.value === tx.category)?.label ?? tx.category
                                : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {tx.lead ? (
                              <span className="text-primary font-medium hover:underline cursor-pointer">
                                {tx.lead.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={cn(
                                'font-semibold tabular-nums',
                                tx.type === 'INCOME'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400',
                              )}
                            >
                              {tx.type === 'INCOME' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {tx.dueDate ? formatDate(tx.dueDate) : '—'}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                tx.isPaid
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
                              )}
                            >
                              {tx.isPaid ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {tx.isPaid ? 'Pago' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingTx(tx); setModalError('') }}
                                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => setDeleteId(tx.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                <span>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Category breakdown */}
          {categoryStats.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Distribuição por Categoria</h3>
              <div className="space-y-3">
                {categoryStats.map(([cat, stats]) => {
                  const total = stats.income + stats.expense
                  const incomeRatio = total > 0 ? (stats.income / total) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">
                          {CATEGORIES.find((c) => c.value === cat)?.label ?? cat}
                        </span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(stats.income)}</span>
                          <span className="text-red-500 dark:text-red-400">-{formatCurrency(stats.expense)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${incomeRatio}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      <TransactionModal
        open={showModal || !!editingTx}
        onClose={() => { setShowModal(false); setEditingTx(null); setModalError('') }}
        onSubmit={(data) => {
          if (editingTx) updateMutation.mutate({ id: editingTx.id, data })
          else createMutation.mutate(data)
        }}
        isPending={isModalPending}
        error={modalError}
        editData={editingTx}
      />

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="mt-4 text-center text-base font-semibold">Excluir transação?</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Esta ação não pode ser desfeita.
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
