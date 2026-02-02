'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TradePartnerFinder } from '@/components/trade'
import { useAuth } from '@/components/providers/auth-provider'
import { unlockAchievement } from '@/lib/gamification'
import type { Database } from '@/lib/supabase/types'
import type { TradeOutput, TradeableAsset, Position } from '@/lib/algorithms/types'

const TradeBuilder = dynamic(
  () => import('@/components/trade').then((mod) => mod.TradeBuilder),
  { loading: () => <div className="space-y-4"><Skeleton className="h-[200px] w-full" /><Skeleton className="h-[200px] w-full" /></div> }
)

const Kaching = dynamic(
  () => import('@/components/animation').then((mod) => mod.Kaching),
  { ssr: false }
)

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
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('builder')
  const [initialReceiveAssets, setInitialReceiveAssets] = useState<TradeableAsset[]>([])
  const [builderKey, setBuilderKey] = useState(0)
  
  const [showKaching, setShowKaching] = useState(false)
  const [tradeResult, setTradeResult] = useState<TradeOutput | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSuggestTrade = (partnerRosterId: string, playerIds: string[]) => {
    const assets: (TradeableAsset | null)[] = playerIds.map(id => {
      const player = initialPlayers.find(p => p.id === id)
      if (!player) return null
      
      const asset: TradeableAsset = {
        type: 'player',
        playerId: player.id,
        fullName: player.full_name || 'Unknown',
        position: (player.position as Position) || 'FLEX',
        projectedPoints: player.projected_points || 0
      }
      return asset
    })

    const filteredAssets = assets.filter((a): a is TradeableAsset => a !== null)

    setInitialReceiveAssets(filteredAssets)
    setBuilderKey(prev => prev + 1)
    setActiveTab('builder')
  }

  const handleTradeSubmit = async (
    youGive: TradeableAsset[], 
    youReceive: TradeableAsset[], 
    biasFactor: number
  ) => {
    setError(null)
    try {
      const response = await fetch('/api/algorithms/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          rosterId,
          giving: youGive,
          receiving: youReceive,
          biasFactor,
          week: defaultWeek
        })
      })

      if (!response.ok) throw new Error('Trade evaluation failed')

      const result = await response.json() as TradeOutput
      setTradeResult(result)

      if (user?.id) {
        unlockAchievement(user.id, 'MADE_FIRST_TRADE').catch(console.error)
      }

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="builder" data-testid="tab-builder">Build Trade</TabsTrigger>
          <TabsTrigger value="partners" data-testid="tab-partners">Find Partners</TabsTrigger>
        </TabsList>
        
        <TabsContent value="builder" className="space-y-4">
          <TradeBuilder
            key={builderKey}
            allPlayers={initialPlayers}
            onTradeSubmit={handleTradeSubmit}
            leagueId={leagueId}
            initialReceive={initialReceiveAssets}
          />
        </TabsContent>
        
        <TabsContent value="partners" className="space-y-4">
          <TradePartnerFinder 
            leagueId={leagueId}
            rosterId={rosterId}
            onSuggestTrade={handleSuggestTrade}
          />
        </TabsContent>
      </Tabs>

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
