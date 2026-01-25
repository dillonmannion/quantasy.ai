'use client'

import { useDraftState } from '@/lib/draft'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function MyTeamSidebar() {
  const { state } = useDraftState()

  if (state.status !== 'mock' || state.picks.length === 0) {
    return null
  }

  const picksByPosition = state.picks.reduce(
    (acc, pick) => {
      const pos = pick.position
      if (!acc[pos]) acc[pos] = []
      acc[pos].push(pick)
      return acc
    },
    {} as Record<string, typeof state.picks>
  )

  return (
    <Card className="p-4 sticky top-4">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">My Team</h3>
        <p className="text-sm text-muted-foreground">
          {state.picks.length} player{state.picks.length !== 1 ? 's' : ''} drafted
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {state.picks.map((pick) => (
            <div
              key={pick.pickNumber}
              className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{pick.playerName}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {pick.position}
                  </div>
                </div>
                <div className="text-xs font-mono text-muted-foreground shrink-0">
                  #{pick.pickNumber}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {state.picks.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            {Object.entries(picksByPosition).map(([position, picks]) => (
              <div key={position} className="flex justify-between">
                <span>{position}:</span>
                <span className="font-medium">{picks.length}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
