'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { FindTradePartnersResult, TradePartnerMatch } from '@/lib/algorithms'

interface TradePartnerFinderProps {
  leagueId: string
  rosterId: number
  onSuggestTrade: (rosterId: string, rosterPlayerIds: string[]) => void
}

export function TradePartnerFinder({
  leagueId,
  rosterId,
  onSuggestTrade
}: TradePartnerFinderProps) {
  const [partners, setPartners] = useState<TradePartnerMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPartners() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/algorithms/trade-partners?leagueId=${leagueId}&rosterId=${rosterId}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch trade partners')
        }
        
        const data = await response.json() as FindTradePartnersResult
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        setPartners(data.matches)
      } catch (err) {
        console.error('Error fetching trade partners:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (leagueId && rosterId) {
      fetchPartners()
    }
  }, [leagueId, rosterId])

  if (loading) {
    return (
      <div className="space-y-4" data-testid="trade-partner-finder-loading">
        <Skeleton className="h-12 w-full max-w-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="trade-partner-finder-error">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (partners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] border rounded-lg bg-card text-card-foreground">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Partners Found</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          We couldn&apos;t find any compatible trade partners based on your current roster strengths and weaknesses.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="trade-partner-list">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Recommended Partners</h2>
        <Badge variant="outline" className="text-sm">
          {partners.length} Matches
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((match, index) => (
          <motion.div
            key={match.rosterId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="h-full flex flex-col hover:border-primary/50 transition-colors" data-testid={`trade-partner-${match.rosterId}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg line-clamp-1" title={match.ownerName}>
                      {match.ownerName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Roster ID: {match.rosterId}
                    </CardDescription>
                  </div>
                  <Badge 
                    className={
                      match.compatibilityScore >= 80 ? 'bg-green-500 hover:bg-green-600' :
                      match.compatibilityScore >= 60 ? 'bg-yellow-500 hover:bg-yellow-600' :
                      'bg-blue-500 hover:bg-blue-600'
                    }
                  >
                    {match.compatibilityScore.toFixed(0)}% Match
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center text-xs font-semibold text-muted-foreground">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    THEY NEED
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {match.theirStrength.needs.length > 0 ? (
                      match.theirStrength.needs.map((pos) => (
                        <Badge key={pos} variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {pos}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Balanced roster</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-xs font-semibold text-muted-foreground">
                    <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
                    YOU NEED
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {match.myStrength.needs.length > 0 ? (
                      match.myStrength.needs.map((pos) => (
                        <Badge key={pos} variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {pos}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Balanced roster</span>
                    )}
                  </div>
                </div>
                
                {match.suggestedPositions.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                     <span className="text-xs text-muted-foreground">Suggested targets: </span>
                     <span className="font-medium text-xs text-foreground">
                        {match.suggestedPositions.join(', ')}
                     </span>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-2">
                <Button 
                  className="w-full" 
                  size="sm" 
                  onClick={() => onSuggestTrade(match.rosterId, match.rosterPlayerIds)}
                  data-testid={`suggest-trade-${match.rosterId}`}
                >
                  Suggest Trade <ArrowRight className="ml-2 w-3 h-3" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
