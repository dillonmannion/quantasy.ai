import { memo } from 'react'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface PlayerCardProps {
  player: PlayerRow
  variant?: 'default' | 'compact' | 'detailed'
  showStats?: boolean
  showTeam?: boolean
  className?: string
  onClick?: () => void
}

const positionColors: Record<string, string> = {
  QB: 'text-red-400 bg-red-400/20',
  RB: 'text-green-400 bg-green-400/20',
  WR: 'text-blue-400 bg-blue-400/20',
  TE: 'text-yellow-400 bg-yellow-400/20',
  K: 'text-purple-400 bg-purple-400/20',
  DEF: 'text-orange-400 bg-orange-400/20',
}

const injuryBadges: Record<string, { label: string; color: string }> = {
  Out: { label: 'OUT', color: 'bg-red-500 text-white' },
  Doubtful: { label: 'D', color: 'bg-orange-500 text-white' },
  Questionable: { label: 'Q', color: 'bg-yellow-500 text-black' },
  IR: { label: 'IR', color: 'bg-red-700 text-white' },
  PUP: { label: 'PUP', color: 'bg-red-600 text-white' },
  Sus: { label: 'SUSP', color: 'bg-gray-600 text-white' },
}

function PlayerAvatar({
  player,
  size = 'md',
}: {
  player: PlayerRow
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  }

  const initials = `${player.first_name?.[0] ?? ''}${player.last_name?.[0] ?? ''}`
  const posColor =
    positionColors[player.position ?? ''] ?? 'text-gray-400 bg-gray-400/20'

  return (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center font-bold shrink-0',
        posColor,
        sizeClasses[size]
      )}
    >
      {initials || '??'}
    </div>
  )
}

function InjuryBadge({ status }: { status: string | null }) {
  if (!status) return null

  const badge = injuryBadges[status]
  if (!badge) return null

  return (
    <span
      className={cn(
        'text-xs px-1.5 py-0.5 rounded font-bold shrink-0',
        badge.color
      )}
    >
      {badge.label}
    </span>
  )
}

function PositionBadge({ position }: { position: string | null }) {
  if (!position) return null

  const color =
    positionColors[position] ?? 'text-gray-400 bg-gray-400/20'

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-semibold', color)}>
      {position}
    </span>
  )
}

export const PlayerCard = memo(function PlayerCard({
  player,
  variant = 'default',
  showStats = false,
  showTeam = true,
  className,
  onClick,
}: PlayerCardProps) {
  const isClickable = !!onClick

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 py-1',
          isClickable && 'cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2',
          className
        )}
        onClick={onClick}
      >
        <PositionBadge position={player.position} />
        <span className="font-medium truncate">{player.full_name}</span>
        {showTeam && player.team && (
          <span className="text-muted-foreground text-sm">{player.team}</span>
        )}
        <InjuryBadge status={player.injury_status} />
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div
        className={cn(
          'card-balatro p-4',
          isClickable && 'cursor-pointer hover:border-primary transition-colors',
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-4">
          <PlayerAvatar player={player} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">{player.full_name}</h3>
              <InjuryBadge status={player.injury_status} />
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <PositionBadge position={player.position} />
              {player.team && <span>{player.team}</span>}
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              {player.age && (
                <div>
                  <span className="text-muted-foreground">Age:</span>{' '}
                  <span className="font-medium">{player.age}</span>
                </div>
              )}
              {player.years_exp !== null && (
                <div>
                  <span className="text-muted-foreground">Exp:</span>{' '}
                  <span className="font-medium">{player.years_exp} yrs</span>
                </div>
              )}
              {player.status && (
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className="font-medium">{player.status}</span>
                </div>
              )}
            </div>

            {showStats && player.projected_points && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-accent font-bold text-lg">
                  {player.projected_points.toFixed(1)} pts
                </span>
                <span className="text-muted-foreground ml-2 text-sm">
                  projected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3',
        isClickable && 'cursor-pointer hover:bg-muted/50 rounded-lg',
        className
      )}
      onClick={onClick}
    >
      <PlayerAvatar player={player} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{player.full_name}</span>
          <InjuryBadge status={player.injury_status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PositionBadge position={player.position} />
          {showTeam && player.team && <span>{player.team}</span>}
        </div>
      </div>

      {showStats && player.projected_points && (
        <div className="text-right shrink-0">
          <div className="font-bold text-accent">
            {player.projected_points.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">pts</div>
        </div>
      )}
    </div>
  )
})

export { PlayerAvatar, InjuryBadge, PositionBadge }
