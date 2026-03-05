'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getBundledProjectionsMap, parseProjectionsCSV } from '@/lib/projections'
import type { SleeperLeague, SleeperPlayer } from '@/lib/sleeper/types'

interface LeagueFormProps {
  onLeagueLoaded: (data: {
    league: SleeperLeague
    players: Record<string, SleeperPlayer>
    projections: Record<string, number>
  }) => void
  onError: (error: string) => void
}

type ProjectionSource = 'bundled' | 'csv'

export function LeagueForm({ onLeagueLoaded, onError }: LeagueFormProps) {
  const [leagueId, setLeagueId] = useState('')
  const [projectionSource, setProjectionSource] = useState<ProjectionSource>('bundled')
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvContent(content)
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedId = leagueId.trim()
    if (!trimmedId) {
      onError('Please enter a league ID')
      return
    }

    if (projectionSource === 'csv' && !csvContent) {
      onError('Please upload a CSV file')
      return
    }

    setIsLoading(true)

    try {
      const [leagueRes, playersRes] = await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${trimmedId}`),
        fetch('https://api.sleeper.app/v1/players/nfl'),
      ])

      if (!leagueRes.ok) {
        if (leagueRes.status === 404) {
          throw new Error('League not found. Check the league ID.')
        }
        throw new Error(`Failed to fetch league: ${leagueRes.statusText}`)
      }

      const league = (await leagueRes.json()) as SleeperLeague
      const players = (await playersRes.json()) as Record<string, SleeperPlayer>

      let projections: Record<string, number>

      if (projectionSource === 'csv' && csvContent) {
        const parseResult = parseProjectionsCSV(csvContent)
        if (parseResult.errors.length > 0 && parseResult.parsed.length === 0) {
          throw new Error(`CSV parse error: ${parseResult.errors[0]}`)
        }
        projections = parseResult.projections
      } else {
        projections = getBundledProjectionsMap()
      }

      onLeagueLoaded({ league, players, projections })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      onError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border/50 bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="leagueId">Sleeper League ID</Label>
          <Input
            id="leagueId"
            type="text"
            placeholder="e.g., 1234567890123456789"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            Find this in your Sleeper league URL: sleeper.com/leagues/<strong>[LEAGUE_ID]</strong>
          </p>
        </div>

        <div className="space-y-3">
          <Label>Projections Source</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="projectionSource"
                value="bundled"
                checked={projectionSource === 'bundled'}
                onChange={() => setProjectionSource('bundled')}
                disabled={isLoading}
                className="accent-primary"
              />
              <span className="text-sm">Bundled 2026</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="projectionSource"
                value="csv"
                checked={projectionSource === 'csv'}
                onChange={() => setProjectionSource('csv')}
                disabled={isLoading}
                className="accent-primary"
              />
              <span className="text-sm">Upload CSV</span>
            </label>
          </div>
        </div>

        {projectionSource === 'csv' && (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full"
            >
              {csvFileName || 'Choose CSV file'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Required columns: <code>player_id</code>, <code>projected_points</code>
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Loading...' : 'Load League'}
      </Button>
    </form>
  )
}
