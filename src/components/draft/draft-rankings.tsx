'use client'

import { useState, useMemo } from 'react'
import { RankingsList } from './rankings-list'
import { RankingsControls } from './rankings-controls'
import { useDraftState } from '@/lib/draft'
import type { MonteCarloOutput } from '@/lib/algorithms/monte-carlo/types'
import { SimulationProgress } from './simulation-overlay'

type Position = 'All' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF' | 'DL' | 'LB' | 'DB'
type SortOption = 'vbd' | 'projected' | 'adp'

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

interface DraftRankingsProps {
  players: Player[]
  simulationResults?: MonteCarloOutput | null
  riskTolerance?: number
  onRiskChange?: (val: number) => void
  simulationStatus?: 'idle' | 'loading' | 'running' | 'complete' | 'error'
  simulationProgress?: number
}

export function DraftRankings({ 
  players,
  simulationResults,
  riskTolerance,
  onRiskChange,
  simulationStatus,
  simulationProgress
}: DraftRankingsProps) {
  const { state } = useDraftState()
  const [selectedPosition, setSelectedPosition] = useState<Position>('All')
  const [hideDrafted, setHideDrafted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('vbd')

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = [...players]

    if (selectedPosition !== 'All') {
      filtered = filtered.filter(p => p.position === selectedPosition)
    }

    if (hideDrafted) {
      filtered = filtered.filter(p => !state.draftedPlayerIds.has(p.playerId))
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query)
      )
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'vbd':
          return b.vbd - a.vbd
        case 'projected':
          return b.projectedPoints - a.projectedPoints
        case 'adp':
          if (a.adp === null && b.adp === null) return 0
          if (a.adp === null) return 1
          if (b.adp === null) return -1
          return a.adp - b.adp
        default:
          return 0
      }
    })

    return filtered.map((p, index) => ({
      ...p,
      rank: index + 1
    }))
  }, [players, selectedPosition, hideDrafted, searchQuery, sortBy, state.draftedPlayerIds])

  return (
    <div className="space-y-4">
      {simulationStatus && simulationProgress !== undefined && (
         <SimulationProgress status={simulationStatus} progress={simulationProgress} />
      )}
      <RankingsControls
        selectedPosition={selectedPosition}
        hideDrafted={hideDrafted}
        sortBy={sortBy}
        onPositionChange={setSelectedPosition}
        onHideDraftedChange={setHideDrafted}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        riskTolerance={riskTolerance}
        onRiskChange={onRiskChange}
      />
      <RankingsList 
        players={filteredAndSortedPlayers} 
        simulationResults={simulationResults}
        simulationStatus={simulationStatus}
      />
    </div>
  )
}
