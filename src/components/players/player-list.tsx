import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { PlayerCard } from './player-card'
import type { Database } from '@/lib/supabase/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface PlayerListProps {
  players: PlayerRow[]
  variant?: 'default' | 'compact' | 'detailed'
  showStats?: boolean
  showTeam?: boolean
  onPlayerClick?: (player: PlayerRow) => void
  emptyMessage?: string
  className?: string
}

export function PlayerList({
  players,
  variant = 'default',
  showStats = false,
  showTeam = true,
  onPlayerClick,
  emptyMessage = 'No players found',
  className,
}: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <StaggerList className={className}>
      {players.map((player) => (
        <StaggerItem key={player.id}>
          <PlayerCard
            player={player}
            variant={variant}
            showStats={showStats}
            showTeam={showTeam}
            onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
          />
        </StaggerItem>
      ))}
    </StaggerList>
  )
}
