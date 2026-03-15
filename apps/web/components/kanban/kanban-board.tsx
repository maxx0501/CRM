'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface KanbanTag {
  id: string
  name: string
  color: string
}

export interface KanbanLead {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  source: string
  score: number
  value?: number | null
  position: number
  stageId: string
  createdAt: string
  tags?: KanbanTag[]
}

export interface KanbanStage {
  id: string
  name: string
  color: string
  position: number
  isWonStage: boolean
  isLostStage: boolean
  leads: KanbanLead[]
}

interface KanbanBoardProps {
  stages: KanbanStage[]
  onMoveLead: (leadId: string, stageId: string, position: number) => void
  onLeadClick: (leadId: string) => void
  onAddLead: (stageId: string) => void
}

// ─── Board component ────────────────────────────────────────────────────────

export function KanbanBoard({ stages, onMoveLead, onLeadClick, onAddLead }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  )

  const allLeads = stages.flatMap((s) => s.leads)
  const activeLead = activeId ? allLeads.find((l) => l.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleDragOver(_event: DragOverEvent) {
    // Optimistic column highlighting is handled via useDroppable's isOver
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string

    let targetStageId: string | null = null
    let targetPosition = 0

    // Dropped directly on a stage column
    const targetStage = stages.find((s) => s.id === overId)
    if (targetStage) {
      targetStageId = targetStage.id
      targetPosition = targetStage.leads.length
    } else {
      // Dropped on another lead card — find parent stage + position
      for (const stage of stages) {
        const leadIdx = stage.leads.findIndex((l) => l.id === overId)
        if (leadIdx !== -1) {
          targetStageId = stage.id
          targetPosition = leadIdx
          break
        }
      }
    }

    if (targetStageId) {
      onMoveLead(leadId, targetStageId, targetPosition)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-scroll flex gap-3 overflow-x-auto pb-6">
        <SortableContext items={stages.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
          {stages
            .sort((a, b) => a.position - b.position)
            .map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                onLeadClick={onLeadClick}
                onAddLead={() => onAddLead(stage.id)}
              />
            ))}
        </SortableContext>
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeLead ? (
          <KanbanCard lead={activeLead} onClick={() => {}} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
