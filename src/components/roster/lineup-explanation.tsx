'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { LineupExplanation } from '@/lib/algorithms/types'

interface LineupExplanationProps {
  explanation: LineupExplanation
  className?: string
}

export function LineupExplanationPanel({
  explanation,
  className,
}: LineupExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Optimization Details</h3>
            <p className="text-sm text-muted-foreground">
              {explanation.inputsSummary.rosterCount} players •{' '}
              {explanation.inputsSummary.starterSlots} starters
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Your Work
              </>
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {explanation.excludedPlayers.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-sm">Excluded Players</h4>
                <div className="space-y-2">
                  {explanation.excludedPlayers.map((player) => (
                    <div
                      key={player.playerId}
                      className="text-sm p-2 bg-muted/50 rounded"
                    >
                      <div className="font-medium">{player.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {player.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {explanation.decisions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-sm">Slot Assignments</h4>
                <div className="space-y-2">
                  {explanation.decisions.map((decision) => (
                    <div
                      key={decision.slotId}
                      className="text-sm p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">{decision.fullName}</div>
                        <div className="font-mono text-xs">
                          {decision.projectedPoints.toFixed(1)} pts
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {decision.slotType === 'starter' ? 'Starter' : 'Bench'} •{' '}
                        {decision.allowedPositions.join(', ')}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {decision.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {explanation.caveats.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Limitations</h4>
                <ul className="space-y-1">
                  {explanation.caveats.map((caveat, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {caveat}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Calculated at{' '}
              {new Date(explanation.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
