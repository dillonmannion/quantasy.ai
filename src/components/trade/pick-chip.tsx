'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'motion/react'
import { GripVertical, X, Disc } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DraftPickAsset, FutureRookiePickAsset } from '@/lib/algorithms/types'

type PickAsset = DraftPickAsset | FutureRookiePickAsset

interface PickChipProps {
  pick: PickAsset
  onRemove: (pickId: string) => void
  isDraggable?: boolean
  value?: number | null
}

export function PickChip({
  pick,
  onRemove,
  isDraggable = true,
  value
}: PickChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: pick.pickId,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Format label: "2025 1.05" or "2026 Round 1"
  const label = pick.type === 'draft_pick'
    ? `${pick.year} ${pick.round}.${pick.pickNumber.toString().padStart(2, '0')}`
    : `${pick.year} Round ${pick.round}`

  const subLabel = pick.type === 'future_rookie_pick' ? 'Future Rookie' : 'Draft Pick'

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      data-testid={`pick-${pick.type === 'draft_pick' ? `${pick.round}-${pick.pickNumber.toString().padStart(2, '0')}` : `${pick.year}-r${pick.round}`}`}
      className={cn(
        'card-balatro p-3 flex items-center gap-2 group border-primary/20',
        isDragging && 'shadow-lg ring-2 ring-primary',
        isDraggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      {isDraggable && (
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
        <Disc className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{label}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{subLabel}</span>
        </div>
      </div>

      {value !== undefined && value !== null && (
        <div className="shrink-0 text-right" data-testid="asset-value">
          <div className="text-xs font-bold">
            {value.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">val</div>
        </div>
      )}

      <button
        onClick={() => onRemove(pick.pickId)}
        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        aria-label={`Remove ${label}`}
        data-testid="pick-chip-remove"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}
