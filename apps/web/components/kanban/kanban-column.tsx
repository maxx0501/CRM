'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trophy, XCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { KanbanCard } from './kanban-card'
import type { KanbanStage } from './kanban-board'

interface KanbanColumnProps {
  stage: KanbanStage
  onLeadClick: (leadId: string) => void
  onAddLead: () => void
}

export function KanbanColumn({ stage, onLeadClick, onAddLead }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const totalValue = stage.leads.reduce((sum, l) => sum + (l.value ?? 0), 0)

  const headerBg = stage.isWonStage
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
    : stage.isLostStage
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
    : 'bg-muted/40 border-border/60'

  return (
    <div
      className={cn(
        'flex w-72 min-w-[288px] flex-col rounded-xl border transition-all duration-200',
        isOver
          ? 'border-primary/40 bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border/60 bg-muted/20',
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          'rounded-t-xl border-b px-3 py-3',
          headerBg,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {/* Color dot or special icon */}
            {stage.isWonStage ? (
              <Trophy className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : stage.isLostStage ? (
              <XCircle className="h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <div
                className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white dark:ring-card"
                style={{ backgroundColor: stage.color }}
              />
            )}
            <h3 className="truncate text-sm font-semibold">{stage.name}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
              {stage.leads.length}
            </span>
            <button
              onClick={onAddLead}
              className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-background/80 text-muted-foreground hover:text-foreground"
              title="Adicionar lead nesta etapa"
              aria-label="Adicionar lead"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {/* Total value */}
        {totalValue > 0 && (
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">
            {formatCurrency(totalValue)} em negócios
          </p>
        )}
      </div>

      {/* Cards list */}
      <div
        ref={setNodeRef}
        className="kanban-column-scroll flex flex-1 flex-col gap-2 overflow-y-auto p-2"
        style={{ minHeight: 80, maxHeight: 'calc(100vh - 280px)' }}
      >
        <SortableContext items={stage.leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {stage.leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead.id)}
            />
          ))}
        </SortableContext>
        {stage.leads.length === 0 && (
          <button
            onClick={onAddLead}
            className="flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground/60 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-muted-foreground"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs">Adicionar lead</span>
          </button>
        )}
      </div>
    </div>
  )
}
