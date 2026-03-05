'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState, useEffect, useMemo } from 'react'
import { useDraftState } from '@/lib/draft'
import { cn } from '@/lib/utils'
import { SwipeablePlayerRow } from './swipeable-player-row'
import { useCelebration } from '@/hooks/use-celebration'
import { Kaching } from '@/components/animation'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { SimulationOverlay } from './simulation-overlay'
import type { MonteCarloOutput } from '@/lib/algorithms/monte-carlo/types'

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
  simulationResults?: MonteCarloOutput | null
  simulationStatus?: 'idle' | 'loading' | 'running' | 'complete' | 'error'
}

function getVBDColor(vbd: number, top25: number, top75: number): string {
  if (vbd >= top25) return 'text-green-500'
  if (vbd >= top75) return 'text-yellow-500'
  return 'text-red-500'
}

export function RankingsList({ players, simulationResults, simulationStatus = 'idle' }: RankingsListProps) {
  const { state, dispatch } = useDraftState()
  const parentRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  const { celebration, celebrate } = useCelebration()
  const prefersReducedMotion = useReducedMotion()
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Calculate VBD thresholds for colors and celebration
  const { top25, top10, top75 } = useMemo(() => {
    const sorted = players.map(p => p.vbd).sort((a, b) => b - a)
    return {
      top10: sorted[Math.floor(sorted.length * 0.10)] || 0,
      top25: sorted[Math.floor(sorted.length * 0.25)] || 0,
      top75: sorted[Math.floor(sorted.length * 0.75)] || 0
    }
  }, [players])
  
  const rowVirtualizer = useVirtualizer({
    count: players.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  })
  
  return (
    <>
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        data-testid="rankings-list"
        tabIndex={0}
        role="region"
        aria-label="Player rankings list"
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
            const vbdColor = getVBDColor(player.vbd, top25, top75)
            const isDraftable = state.status === 'mock' && !isDrafted
            
            const handleDraft = () => {
              if (isDraftable) {
                dispatch({
                  type: 'MARK_DRAFTED',
                  playerId: player.playerId,
                  playerName: player.name,
                  position: player.position,
                  rosterId: state.userRosterId || 0
                })

                if (player.vbd >= top25) {
                  const variant = player.vbd >= top10 ? 'green' : 'gold'
                  celebrate(
                    player.vbd.toFixed(1), 
                    `Great Value! (${player.name})`,
                    variant
                  )
                }
              }
            }
            
              const rowContent = (
              <div
                className={cn(
                  'relative flex items-center gap-4 px-4 py-3 border-b hover:bg-accent transition-all duration-200',
                  isDraftable && !isMobile && 'cursor-pointer hover:scale-[1.01] hover:shadow-md origin-center',
                  isDrafted && 'bg-muted text-muted-foreground'
                )}
                onClick={!isMobile ? handleDraft : undefined}
                data-testid="player-card"
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
                
                <div className="flex items-center gap-2 md:gap-6 text-sm">
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

                 <SimulationOverlay 
                   status={simulationStatus}
                   progress={0}
                   results={simulationResults || null}
                   playerId={player.playerId}
                 />
              </div>
            )
            
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
              >
                {isMobile ? (
                  <SwipeablePlayerRow
                    playerId={player.playerId}
                    playerName={player.name}
                    position={player.position}
                    vbd={player.vbd}
                    onDraft={handleDraft}
                    isDraftable={isDraftable}
                    enableDrag={isMobile}
                  >
                    {rowContent}
                  </SwipeablePlayerRow>
                ) : (
                  rowContent
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      <div 
        aria-live="assertive" 
        aria-atomic="true"
        className="sr-only"
      >
        {celebration?.show && celebration.label && `${celebration.label}`}
      </div>
      
      {!prefersReducedMotion && celebration && <Kaching {...celebration} />}
    </>
  )
}
