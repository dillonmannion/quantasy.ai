'use client'

import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DraftShell } from '@/components/draft/draft-shell'
import { DraftRankings } from '@/components/draft/draft-rankings'
import { MockDraftControls } from '@/components/draft/mock-draft-controls'
import { MyTeamSidebar } from '@/components/draft/my-team-sidebar'
import { calculateVBD } from '@/lib/algorithms/vbd'
import { detectScoringFormat } from '@/lib/algorithms/scoring'
import type { VBDInput, Position, PlayerRanking } from '@/lib/algorithms/types'
import type { SleeperLeague, SleeperPlayer } from '@/lib/sleeper/types'
import { useDraftState } from '@/lib/draft'
import { useMonteCarlo } from '@/hooks/use-monte-carlo'

import type { MonteCarloInput } from '@/lib/algorithms/monte-carlo/types'

interface SandboxDraftViewProps {
  league: SleeperLeague
  players: Record<string, SleeperPlayer>
  projections: Record<string, number>
  onReset: () => void
}

interface SandboxContentProps {
  vbdRankings: PlayerRanking[]
  leagueInfo: {
    name: string
    teams: number
    scoringFormat: string
    positions: Record<string, number>
  }
  onReset: () => void
}

function SandboxContent({ vbdRankings, leagueInfo, onReset }: SandboxContentProps) {
  const { state } = useDraftState()
  const [draftPosition, setDraftPosition] = useState(1)
  const [adpMap, setAdpMap] = useState<Record<string, number>>({})
  const [adpLoading, setAdpLoading] = useState(true)
  
  useEffect(() => {
    let format: 'ppr' | 'half-ppr' | 'standard' = 'ppr'
    if (leagueInfo.scoringFormat === 'half_ppr') format = 'half-ppr'
    else if (leagueInfo.scoringFormat === 'standard') format = 'standard'
    
    // Using 2024 as safe default for ADP data
    const year = 2024 
    
    const params = new URLSearchParams({ format, teams: String(leagueInfo.teams), year: String(year) })
    fetch(`/api/adp?${params}`)
      .then(res => res.json())
      .then((data: { adp?: Record<string, number> }) => {
        setAdpMap(data.adp ?? {})
      })
      .catch(() => {
        console.warn('[Sandbox] ADP fetch failed, continuing without external ADP')
      })
      .finally(() => {
        setAdpLoading(false)
      })
  }, [leagueInfo.scoringFormat, leagueInfo.teams])

  // Prepare input for Monte Carlo
  const baseInput = useMemo(() => {
    const input: Omit<MonteCarloInput, 'riskTolerance' | 'preferences'> = {
      players: vbdRankings,
      adpMap,
      draftState: state,
      userRosterId: draftPosition, // Use draft position as roster ID in sandbox
      guardrailConfig: {
        requireTE: true,
        no2ndQB: false,
        minStartersByPosition: {
          QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0, DL: 0, LB: 0, DB: 0, FLEX: 0, SUPERFLEX: 0, REC_FLEX: 0, WRRB_FLEX: 0, IDP_FLEX: 0
        }
      },
      marketConfig: {
        noiseStdDev: 5,
        adpWeight: 0.8,
        tiebreaker: 0.001
      }
    }
    return input
  }, [vbdRankings, adpMap, state, draftPosition])

  const { 
    status, 
    progress, 
    results, 
    riskTolerance, 
    setRiskTolerance 
  } = useMonteCarlo(baseInput, { 
    enabled: true,
    initialRiskTolerance: 0.5 
  })

  const displayPlayers = useMemo(() => vbdRankings.map(r => ({
    playerId: r.playerId,
    name: r.fullName,
    position: r.position,
    team: r.team,
    vbd: r.vbdScore,
    projectedPoints: r.projectedPoints,
    adp: adpMap[r.fullName] || r.overallRank,
    rank: r.overallRank,
  })), [vbdRankings, adpMap])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Draft Sandbox</h1>
            <p className="text-muted-foreground">{leagueInfo.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <MockDraftControls />
            <Button variant="outline" onClick={onReset}>
              Change League
            </Button>
          </div>
        </div>

        {/* Configuration Row */}
        <div className="flex items-center gap-4 border p-4 rounded-lg bg-card">
          <div className="space-y-2">
            <Label htmlFor="draft-pos">My Draft Position</Label>
            <Input 
              id="draft-pos"
              type="number" 
              min={1} 
              max={leagueInfo.teams} 
              value={draftPosition}
              onChange={(e) => setDraftPosition(Number(e.target.value))}
              className="w-24 font-mono"
            />
          </div>
          
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">
              {adpLoading ? (
                <span className="animate-pulse">Fetching market data...</span>
              ) : (
                <span>Market Data: {Object.keys(adpMap).length > 0 ? 'Connected' : 'Unavailable (Using Ranks)'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded bg-primary/10 px-2 py-1 text-primary">
          {leagueInfo.teams} Teams
        </span>
        <span className="rounded bg-primary/10 px-2 py-1 text-primary">
          {leagueInfo.scoringFormat.toUpperCase().replace('_', ' ')}
        </span>
        {Object.entries(leagueInfo.positions)
          .filter(([pos]) => !['BN', 'IR'].includes(pos))
          .map(([pos, count]) => (
            <span
              key={pos}
              className="rounded bg-muted px-2 py-1 text-muted-foreground"
            >
              {count}x {pos}
            </span>
          ))}
      </div>

      {displayPlayers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] lg:grid-cols-[1fr_300px] gap-6">
          <DraftRankings 
            players={displayPlayers}
            simulationResults={results}
            simulationStatus={status}
            simulationProgress={progress}
            riskTolerance={riskTolerance}
            onRiskChange={setRiskTolerance}
          />
          <MyTeamSidebar />
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No rankings available. The bundled projections may not match any players.
          </p>
          <Button variant="outline" onClick={onReset} className="mt-4">
            Try Different Projections
          </Button>
        </div>
      )}
    </div>
  )
}

export function SandboxDraftView({
  league,
  players,
  projections,
  onReset,
}: SandboxDraftViewProps) {
  const vbdRankings = useMemo(() => {
    const playersArray = Object.values(players).filter(
      (p) => p.position && ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'].includes(p.position)
    )

    const scoringSettings = league.scoring_settings || {}
    const rosterPositions = (league.roster_positions || []) as Position[]
    const scoringFormat = detectScoringFormat(scoringSettings)

    const vbdInput: VBDInput = {
      players: playersArray,
      projections,
      leagueSettings: {
        teams: league.total_rosters || 12,
        rosterPositions,
        scoringSettings,
      },
      scoringFormat,
      projectionSource: 'sandbox',
    }

    const output = calculateVBD(vbdInput)

    return output.rankings.slice(0, 500)
  }, [league, players, projections])

  const leagueInfo = useMemo(() => {
    const scoringFormat = detectScoringFormat(league.scoring_settings || {})
    const rosterPositions = league.roster_positions || []
    
    const positionCounts: Record<string, number> = {}
    rosterPositions.forEach((pos) => {
      positionCounts[pos] = (positionCounts[pos] || 0) + 1
    })

    return {
      name: league.name,
      teams: league.total_rosters,
      scoringFormat,
      positions: positionCounts,
    }
  }, [league])

  return (
    <DraftShell status="mock">
      <SandboxContent 
        vbdRankings={vbdRankings}
        leagueInfo={leagueInfo}
        onReset={onReset}
      />
    </DraftShell>
  )
}
