'use client'

import { useState, useCallback } from 'react'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LeagueForm } from './league-form'
import { SandboxDraftView } from './sandbox-draft-view'
import type { SleeperLeague, SleeperPlayer } from '@/lib/sleeper/types'

interface LoadedLeagueData {
  league: SleeperLeague
  players: Record<string, SleeperPlayer>
  projections: Record<string, number>
}

export default function DraftSandboxPage() {
  const [leagueData, setLeagueData] = useState<LoadedLeagueData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLeagueLoaded = useCallback((data: LoadedLeagueData) => {
    setLeagueData(data)
    setError(null)
  }, [])

  const handleError = useCallback((err: string) => {
    setError(err)
    setLeagueData(null)
  }, [])

  const handleReset = useCallback(() => {
    setLeagueData(null)
    setError(null)
  }, [])

  if (leagueData) {
    return (
      <SandboxDraftView
        league={leagueData.league}
        players={leagueData.players}
        projections={leagueData.projections}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold">Draft Sandbox</h1>
        <p className="text-lg text-muted-foreground">
          Test VBD rankings with your Sleeper league settings
        </p>
      </div>

      <LeagueForm onLeagueLoaded={handleLeagueLoaded} onError={handleError} />

      {error && (
        <ErrorAlert message={error} />
      )}

      <div className="rounded-lg border border-border/50 bg-card/50 p-6 text-sm text-muted-foreground">
        <h3 className="mb-2 font-semibold text-foreground">How it works</h3>
        <ol className="list-inside list-decimal space-y-1">
          <li>Enter your Sleeper league ID (from the league URL)</li>
          <li>League settings are fetched (teams, roster positions, scoring)</li>
          <li>Choose projections: bundled 2026 or upload your CSV</li>
          <li>VBD algorithm calculates rankings for your league</li>
        </ol>
      </div>
    </div>
  )
}
