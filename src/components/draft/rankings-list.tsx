'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { useDraftState } from '@/lib/draft'
import { cn } from '@/lib/utils'

interface Player {
  playerId: string
  name: string
  position: string
  team: string | null
  vbd: number
  projectedPoints: number
  adp: number | null
  rank: number
}

interface RankingsListProps {
  players: Player[]
}

function getVBDColor(vbd: number, allVBDs: number[]): string {
  const sorted = [...allVBDs].sort((a, b) => b - a)
  const top25Index = Math.floor(sorted.length * 0.25)
  const top75Index = Math.floor(sorted.length * 0.75)
  
  const top25Threshold = sorted[top25Index]
  const top75Threshold = sorted[top75Index]
  
  if (vbd >= top25Threshold) return 'text-green-500'
  if (vbd >= top75Threshold) return 'text-yellow-500'
  return 'text-red-500'
}

export function RankingsList({ players }: RankingsListProps) {
  const { state } = useDraftState()
  const parentRef = useRef<HTMLDivElement>(null)
  
  const allVBDs = players.map(p => p.vbd)
  
  const rowVirtualizer = useVirtualizer({
    count: players.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  })
  
  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto border rounded-lg"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const player = players[virtualRow.index]
          const isDrafted = state.draftedPlayerIds.has(player.playerId)
          const vbdColor = getVBDColor(player.vbd, allVBDs)
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={cn(
                'flex items-center gap-4 px-4 py-3 border-b hover:bg-accent/50 transition-colors',
                isDrafted && 'opacity-50 bg-muted'
              )}
            >
              <div className="w-12 text-center font-mono text-sm text-muted-foreground">
                {player.rank}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'font-medium truncate',
                  isDrafted && 'line-through'
                )}>
                  {player.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {player.team || 'FA'} • {player.position}
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">VBD</div>
                  <div className={cn('font-mono font-bold', vbdColor)}>
                    {player.vbd.toFixed(1)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Proj</div>
                  <div className="font-mono">
                    {player.projectedPoints.toFixed(1)}
                  </div>
                </div>
                
                {player.adp !== null && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">ADP</div>
                    <div className="font-mono">
                      {player.adp.toFixed(0)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
