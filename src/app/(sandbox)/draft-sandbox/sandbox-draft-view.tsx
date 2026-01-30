'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DraftShell } from '@/components/draft/draft-shell'
import { DraftRankings } from '@/components/draft/draft-rankings'
import { MockDraftControls } from '@/components/draft/mock-draft-controls'
import { MyTeamSidebar } from '@/components/draft/my-team-sidebar'
import { calculateVBD } from '@/lib/algorithms/vbd'
import { detectScoringFormat } from '@/lib/algorithms/scoring'
import type { VBDInput, Position } from '@/lib/algorithms/types'
import type { SleeperLeague, SleeperPlayer } from '@/lib/sleeper/types'

interface SandboxDraftViewProps {
  league: SleeperLeague
  players: Record<string, SleeperPlayer>
  projections: Record<string, number>
  onReset: () => void
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

    return output.rankings.slice(0, 500).map((r) => ({
      playerId: r.playerId,
      name: r.fullName,
      position: r.position,
      team: r.team,
      vbd: r.vbdScore,
      projectedPoints: r.projectedPoints,
      adp: r.overallRank,
      rank: r.overallRank,
    }))
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
      <div className="space-y-6">
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

        {vbdRankings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <DraftRankings players={vbdRankings} />
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
    </DraftShell>
  )
}
