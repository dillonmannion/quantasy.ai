import { Card } from '@/components/ui/card'
import type { AlgorithmPlayer } from '@/lib/algorithms/types'

interface Props {
  droppable: AlgorithmPlayer[]
}

export function DroppablePlayerSelector({ droppable }: Props) {
  if (droppable.length === 0) {
    return (
      <Card className="card-balatro p-6 bg-yellow-500/10 border-yellow-500/20">
        <p className="text-sm">
          <strong>No droppable players</strong> - your roster minimum is met at all positions. 
          You may need to make roster moves before adding players.
        </p>
      </Card>
    )
  }
  
  return (
    <Card className="card-balatro p-6">
      <h3 className="font-bold mb-4">Droppable Players</h3>
      <div className="space-y-2">
        {droppable.map(player => (
          <div key={player.playerId} className="flex justify-between items-center p-2 rounded hover:bg-accent/50 border border-transparent hover:border-border">
            <div>
              <p className="font-semibold">{player.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {player.position} - {player.team} - {player.projectedPoints.toFixed(1)} pts
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
