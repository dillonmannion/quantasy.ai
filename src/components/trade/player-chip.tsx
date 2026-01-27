'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'motion/react'
import { GripVertical, X } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface PlayerChipProps {
  player: PlayerRow
  onRemove: (playerId: string) => void
  isDraggable?: boolean
  showVBD?: boolean
}

const positionColors: Record<string, string> = {
  QB: 'text-red-400 bg-red-400/20',
  RB: 'text-green-400 bg-green-400/20',
  WR: 'text-blue-400 bg-blue-400/20',
  TE: 'text-yellow-400 bg-yellow-400/20',
  K: 'text-purple-400 bg-purple-400/20',
  DEF: 'text-orange-400 bg-orange-400/20',
}

export function PlayerChip({
  player,
  onRemove,
  isDraggable = true,
  showVBD = true,
}: PlayerChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: player.id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const posColor =
    positionColors[player.position ?? ''] ?? 'text-gray-400 bg-gray-400/20'

  const initials = `${player.first_name?.[0] ?? ''}${player.last_name?.[0] ?? ''}`

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={cn(
        'card-balatro p-3 flex items-center gap-2 group',
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

      <div
        className={cn(
          'w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0',
          posColor
        )}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{player.full_name}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className={cn('px-1.5 py-0.5 rounded', posColor)}>
            {player.position}
          </span>
          {player.team && <span>{player.team}</span>}
        </div>
      </div>

      {showVBD && (
        <div className="shrink-0 text-right">
          <div className="text-xs font-bold text-accent">★</div>
          <div className="text-xs text-muted-foreground">VBD</div>
        </div>
      )}

      {player.projected_points !== null && (
        <div className="shrink-0 text-right">
          <div className="text-xs font-bold">
            {player.projected_points.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">pts</div>
        </div>
      )}

      <button
        onClick={() => onRemove(player.id)}
        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        aria-label={`Remove ${player.full_name}`}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}
