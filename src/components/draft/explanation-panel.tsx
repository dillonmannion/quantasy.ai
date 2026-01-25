'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Player {
  playerId: string
  name: string
  position: string
  team: string | null
  vbd: number
  projectedPoints: number
  rank: number
}

interface Baseline {
  position: string
  playerName: string
  projectedPoints: number
  baselineRank: number
}

interface ExplanationPanelProps {
  player: Player
  baseline: Baseline | null
  scoringFormat: string
  leagueSize: number
  leagueId?: string
  scoringSettings?: Record<string, number>
  projectionSource?: string
  projectionUpdatedAt?: string
}

export function ExplanationPanel({
  player,
  baseline,
  scoringFormat,
  leagueSize,
  leagueId,
  scoringSettings,
  projectionSource,
  projectionUpdatedAt,
}: ExplanationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  const canGenerateAI = leagueId && scoringSettings && projectionSource && projectionUpdatedAt && baseline

  const handleGenerateAI = async () => {
    if (!canGenerateAI) return

    setIsLoadingAI(true)
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.playerId,
          leagueId,
          playerName: player.name,
          position: player.position,
          vbd: player.vbd,
          projectedPoints: player.projectedPoints,
          baselinePlayerName: baseline.playerName,
          baselinePoints: baseline.projectedPoints,
          scoringFormat,
          scoringSettings,
          projectionSource,
          projectionUpdatedAt,
        }),
      })

      if (res.status === 429) {
        const data = await res.json()
        setAiExplanation(`Rate limited. Try again in ${Math.ceil(data.retryAfterMs / 1000)}s`)
        return
      }

      if (!res.ok) {
        setAiExplanation('AI explanation unavailable')
        return
      }

      const data = await res.json()
      setAiExplanation(data.explanation)
    } catch {
      setAiExplanation('AI explanation unavailable')
    } finally {
      setIsLoadingAI(false)
    }
  }

  if (!baseline) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          No baseline available for {player.position}
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4" data-testid="explanation-panel">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{player.name}</h3>
            <p className="text-sm text-muted-foreground">
              {player.team} • {player.position} • Rank #{player.rank}
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

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">
              {player.vbd.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">VBD Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {player.projectedPoints.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Projected</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-muted-foreground">
              {baseline.projectedPoints.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Baseline</div>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h4 className="font-medium mb-2">VBD Calculation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Player Projection:</span>
                  <span className="font-mono">{player.projectedPoints.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Baseline ({baseline.playerName}):</span>
                  <span className="font-mono">- {baseline.projectedPoints.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Value Above Baseline:</span>
                  <span className="font-mono text-primary">{player.vbd.toFixed(1)} pts</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Baseline Explanation</h4>
              <p className="text-sm text-muted-foreground">
                The baseline is the last starter at this position in a {leagueSize}-team league.
                For {player.position}, that's {baseline.playerName} at rank #{baseline.baselineRank}.
                Players above this baseline provide "value" to your team.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">League Settings</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scoring Format:</span>
                  <span className="font-medium">{scoringFormat.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">League Size:</span>
                  <span className="font-medium">{leagueSize} teams</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium mb-1 text-sm">Why VBD?</h4>
              <p className="text-xs text-muted-foreground">
                Value-Based Drafting (VBD) helps you identify which players provide the most value
                relative to replacement-level options. A high VBD means this player is significantly
                better than the baseline, making them more valuable in your draft.
              </p>
            </div>

            {canGenerateAI && (
              <div className="space-y-2">
                <h4 className="font-medium">AI Insight</h4>
                {aiExplanation ? (
                  <p className="text-sm text-muted-foreground">{aiExplanation}</p>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAI}
                    disabled={isLoadingAI}
                  >
                    {isLoadingAI ? 'Generating...' : 'Generate AI Explanation'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
