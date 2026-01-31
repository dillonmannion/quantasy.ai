'use client'

import { useState } from 'react'
import { TradeBuilder } from '@/components/trade'
import { Kaching } from '@/components/animation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import type { TradeOutput } from '@/lib/algorithms/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface TradeClientProps {
  leagueId: string
  rosterId: number
  defaultWeek: number
  initialPlayers: PlayerRow[]
}

export function TradeClient({
  leagueId,
  rosterId,
  defaultWeek,
  initialPlayers
}: TradeClientProps) {
  const [showKaching, setShowKaching] = useState(false)
  const [tradeResult, setTradeResult] = useState<TradeOutput | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTradeSubmit = async (youGive: PlayerRow[], youReceive: PlayerRow[]) => {
    setError(null)
    try {
      const response = await fetch('/api/algorithms/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          rosterId,
          givingPlayerIds: youGive.map(p => p.id),
          receivingPlayerIds: youReceive.map(p => p.id),
          week: defaultWeek
        })
      })

      if (!response.ok) throw new Error('Trade evaluation failed')

      const result = await response.json() as TradeOutput
      setTradeResult(result)

      if (result.verdict === 'great') {
        setShowKaching(true)
        setTimeout(() => setShowKaching(false), 3000)
      }

      setShowResultDialog(true)
    } catch (error) {
      console.error('Trade error:', error)
      setError('Failed to evaluate trade. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" aria-live="polite">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TradeBuilder
        allPlayers={initialPlayers}
        onTradeSubmit={handleTradeSubmit}
      />

      <Kaching
        show={showKaching}
        value={tradeResult?.fairnessScore ?? 0}
        label="Trade Value"
        variant="purple"
      />

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trade Analysis</DialogTitle>
            <DialogDescription>
              Verdict: <span className="font-bold text-foreground">{tradeResult?.verdict.toUpperCase().replace('-', ' ')}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted p-3 rounded-md">
              <span className="text-sm font-medium">Fairness Score</span>
              <span className="text-lg font-bold">
                {tradeResult?.fairnessScore !== undefined ? tradeResult.fairnessScore.toFixed(1) : '-'}
              </span>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Methodology</h4>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {tradeResult?.explanation.methodology}
              </p>
            </div>
            
            {tradeResult?.explanation.caveats && tradeResult.explanation.caveats.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-yellow-500">Caveats</h4>
                <ul className="text-xs list-disc list-inside text-muted-foreground">
                  {tradeResult.explanation.caveats.map((caveat, i) => (
                    <li key={i}>{caveat}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
