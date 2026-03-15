'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, formatCurrency } from '@/lib/utils'
import { Phone, Mail, GripVertical, Star, Clock } from 'lucide-react'
import type { KanbanLead } from './kanban-board'

interface KanbanCardProps {
  lead: KanbanLead
  onClick: () => void
  isOverlay?: boolean
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days}d atrás`
  if (days < 30) return `${Math.floor(days / 7)}sem atrás`
  return `${Math.floor(days / 30)}m atrás`
}

export function KanbanCard({ lead, onClick, isOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative cursor-pointer rounded-lg border border-border/60 bg-card p-3 shadow-sm',
        'transition-all duration-150 hover:border-primary/30 hover:shadow-md',
        isDragging && 'opacity-40 shadow-none',
        isOverlay && 'rotate-2 scale-105 shadow-xl border-primary/40',
      )}
      onClick={onClick}
    >
      {/* Drag handle */}
      <button
        className={cn(
          'absolute right-2 top-2 cursor-grab touch-none rounded p-0.5',
          'text-muted-foreground/40 opacity-0 transition-opacity',
          'group-hover:opacity-100 hover:text-muted-foreground',
          isOverlay && 'opacity-100',
        )}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="Mover card"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Lead name */}
      <div className="pr-6">
        <h4 className="text-sm font-semibold leading-tight text-foreground">{lead.name}</h4>
      </div>

      {/* Contact info */}
      {(lead.phone || lead.email) && (
        <div className="mt-2 space-y-1">
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: t.color + '20', color: t.color }}
            >
              {t.name}
            </span>
          ))}
          {lead.tags.length > 3 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              +{lead.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: value + score + date */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {lead.value != null && lead.value > 0 && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(lead.value)}
            </span>
          )}
          {lead.source && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {lead.source}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lead.score > 0 && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${scoreColor(lead.score)}`}>
              <Star className="h-3 w-3" />
              <span>{lead.score}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock className="h-2.5 w-2.5" />
            <span>{formatRelativeDate(lead.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
