'use client'

import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface KeeperInfo {
  playerId: string
  playerName: string
  position: string
  team: string | null
  rosterId: number
  ownerName?: string
}

interface KeeperSectionProps {
  keepers: KeeperInfo[]
  leagueType: number
}

export function KeeperSection({ keepers, leagueType }: KeeperSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (leagueType !== 1 && leagueType !== 2) {
    return null
  }

  if (keepers.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          No keepers for this league
        </p>
      </Card>
    )
  }

  const keepersByRoster = keepers.reduce((acc, keeper) => {
    const key = keeper.ownerName || `Team ${keeper.rosterId}`
    if (!acc[key]) acc[key] = []
    acc[key].push(keeper)
    return acc
  }, {} as Record<string, KeeperInfo[]>)

  return (
    <Card className="p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <div>
            <h3 className="font-semibold text-lg">Keepers</h3>
            <p className="text-sm text-muted-foreground">
              {keepers.length} player{keepers.length !== 1 ? 's' : ''} kept
            </p>
          </div>
          <ChevronDown 
            className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4 space-y-4">
          {Object.entries(keepersByRoster).map(([teamName, teamKeepers]) => (
            <div key={teamName}>
              <h4 className="text-sm font-medium mb-2">{teamName}</h4>
              <div className="space-y-2">
                {teamKeepers.map((keeper) => (
                  <div
                    key={keeper.playerId}
                    className="p-2 bg-muted rounded text-sm"
                  >
                    <div className="font-medium">{keeper.playerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {keeper.position} - {keeper.team || 'FA'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
