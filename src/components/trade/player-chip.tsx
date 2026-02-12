'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'motion/react'
import { GripVertical, X } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import type { PlayerAsset } from '@/lib/algorithms/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface PlayerChipProps {
  player: PlayerRow | PlayerAsset
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
  let id: string
  let fullName: string
  let position: string | null
  let team: string | null
  let projectedPoints: number | null
  let firstName: string | null
  let lastName: string | null

  if ('type' in player && player.type === 'player') {
    id = player.playerId
    fullName = player.fullName
    position = player.position
    team = null
    projectedPoints = player.projectedPoints
    firstName = fullName.split(' ')[0]
    lastName = fullName.split(' ').slice(1).join(' ')
  } else {
    const p = player as PlayerRow
    id = p.id
    fullName = p.full_name
    position = p.position
    team = p.team
    projectedPoints = p.projected_points
    firstName = p.first_name
    lastName = p.last_name
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const posColor =
    positionColors[position ?? ''] ?? 'text-gray-400 bg-gray-400/20'

  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      data-testid="player-chip"
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
          className="shrink-0 text-[#a1a1aa] opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="font-semibold text-sm truncate">{fullName}</div>
        <div className="flex items-center gap-1 text-xs text-[#a1a1aa]">
          <span className={cn('px-1.5 py-0.5 rounded', posColor)}>
            {position}
          </span>
          {team && <span>{team}</span>}
        </div>
      </div>

      {showVBD && (
        <div className="shrink-0 text-right">
          <div className="text-xs font-bold text-accent">★</div>
          <div className="text-xs text-[#a1a1aa]">VBD</div>
        </div>
      )}

      {projectedPoints !== null && (
        <div className="shrink-0 text-right">
          <div className="text-xs font-bold">
            {projectedPoints.toFixed(1)}
          </div>
          <div className="text-xs text-[#a1a1aa]">pts</div>
        </div>
      )}

      <button
        onClick={() => onRemove(id)}
        className="shrink-0 text-[#a1a1aa] hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        aria-label={`Remove ${fullName}`}
        data-testid="player-chip-remove"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}
