'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { FadeIn, Kaching } from '@/components/animation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { useCelebration } from '@/hooks/use-celebration'
import type { TradeOutput } from '@/lib/algorithms/types'

interface TradeState {
  giving: string[]
  receiving: string[]
  tradeResult: TradeOutput | null
  loading: boolean
  error: string | null
}

interface PlayerWithProjection {
  id: string
  full_name: string | null
  position: string | null
  team: string | null
  projected_points: number | null
}

interface Props {
  leagueId: string
  rosterId: number
  defaultWeek: number
  initialRosterPlayers: PlayerWithProjection[]
}

export function TradeClient({ leagueId, rosterId, defaultWeek, initialRosterPlayers }: Props) {
  const { celebration, celebrate } = useCelebration(2000)
  
  const [state, setState] = useState<TradeState>({
    giving: [],
    receiving: [],
    tradeResult: null,
    loading: false,
    error: null,
  })

  const [week] = useState<number>(defaultWeek)
  
  const [playerCache, setPlayerCache] = useState<Map<string, PlayerWithProjection>>(() =>
    new Map(initialRosterPlayers.map(p => [p.id, p]))
  )
  
  const [rosterPlayers] = useState<PlayerWithProjection[]>(initialRosterPlayers)
  const [searchResults, setSearchResults] = useState<PlayerWithProjection[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'giving' | 'receiving'>('giving')
  const [searchQuery, setSearchQuery] = useState('')
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const searchPlayers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    setSearchLoading(true)
    try {
      const response = await fetch(
        `/api/players?search=${encodeURIComponent(query)}&limit=50&fields=id,full_name,position,team,projected_points`
      )
      if (response.ok) {
        const { players } = await response.json()
        setSearchResults(players)
        setPlayerCache(prev => {
          const next = new Map(prev)
          for (const p of players) {
            next.set(p.id, p)
          }
          return next
        })
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (modalMode !== 'receiving' || !modalOpen) return
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    
    searchDebounceRef.current = setTimeout(() => {
      searchPlayers(searchQuery)
    }, 300)
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery, modalMode, modalOpen, searchPlayers])

  const calculateTrade = useCallback(async (giving: string[], receiving: string[]) => {
    if (giving.length === 0 || receiving.length === 0) {
      setState(prev => ({ ...prev, tradeResult: null, error: null }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/algorithms/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          rosterId,
          givingPlayerIds: giving,
          receivingPlayerIds: receiving,
          week,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.error || 'Failed to calculate trade',
          tradeResult: null,
        }))
        return
      }

      const result: TradeOutput = await response.json()
      setState(prev => ({
        ...prev,
        loading: false,
        tradeResult: result,
        error: null,
      }))

      if (result.verdict === 'great') {
        celebrate(Math.round(result.fairnessScore), 'Great Trade!', 'gold')
      }
    } catch (error) {
      console.error('Trade calculation error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to calculate trade',
        tradeResult: null,
      }))
    }
  }, [leagueId, rosterId, week, celebrate])

  const debouncedCalculate = useCallback((giving: string[], receiving: string[]) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      calculateTrade(giving, receiving)
    }, 500)
  }, [calculateTrade])

  const addPlayer = (player: PlayerWithProjection) => {
    setPlayerCache(prev => new Map(prev).set(player.id, player))
    
    setState(prev => {
      const newState = { ...prev }
      if (modalMode === 'giving') {
        if (!newState.giving.includes(player.id)) {
          newState.giving = [...newState.giving, player.id]
        }
      } else {
        if (!newState.receiving.includes(player.id)) {
          newState.receiving = [...newState.receiving, player.id]
        }
      }
      debouncedCalculate(newState.giving, newState.receiving)
      return newState
    })
    setModalOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const removePlayer = (playerId: string, side: 'giving' | 'receiving') => {
    setState(prev => {
      const newState = { ...prev }
      if (side === 'giving') {
        newState.giving = newState.giving.filter(id => id !== playerId)
      } else {
        newState.receiving = newState.receiving.filter(id => id !== playerId)
      }
      debouncedCalculate(newState.giving, newState.receiving)
      return newState
    })
  }

  const getPlayer = (playerId: string) => playerCache.get(playerId)
  const getPlayerName = (playerId: string) => getPlayer(playerId)?.full_name || 'Unknown Player'
  const getPlayerPosition = (playerId: string) => getPlayer(playerId)?.position || 'N/A'
  const getPlayerTeam = (playerId: string) => getPlayer(playerId)?.team || 'N/A'
  const getPlayerProjection = (playerId: string) => getPlayer(playerId)?.projected_points || 0

  const filteredPlayers = modalMode === 'giving'
    ? rosterPlayers.filter(p => {
        const query = searchQuery.toLowerCase()
        return (
          p.full_name?.toLowerCase().includes(query) ||
          p.position?.toLowerCase().includes(query) ||
          p.team?.toLowerCase().includes(query)
        )
      })
    : searchResults

  const verdictColors = {
    'great': 'bg-green-500/20 text-green-700 border-green-500/50',
    'fair': 'bg-blue-500/20 text-blue-700 border-blue-500/50',
    'bad': 'bg-orange-500/20 text-orange-700 border-orange-500/50',
    'veto-worthy': 'bg-red-500/20 text-red-700 border-red-500/50',
  }

  return (
    <>
      <FadeIn>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Trade Calculator</h1>
            <p className="text-muted-foreground">
              Evaluate trades with transparent VBD-based fairness scoring
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-balatro p-6">
              <h2 className="text-xl font-bold mb-4">You Give</h2>
              <div className="space-y-3 mb-4">
                {state.giving.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No players selected</p>
                ) : (
                  state.giving.map(playerId => (
                    <div
                      key={playerId}
                      className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border/50"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{getPlayerName(playerId)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getPlayerPosition(playerId)} • {getPlayerTeam(playerId)} • {getPlayerProjection(playerId).toFixed(1)} pts
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlayer(playerId, 'giving')}
                        className="ml-2"
                      >
                        ✕
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <Button
                onClick={() => {
                  setModalMode('giving')
                  setModalOpen(true)
                  setSearchQuery('')
                }}
                className="w-full"
                variant="outline"
              >
                + Add Player
              </Button>
            </Card>

            <Card className="card-balatro p-6">
              <h2 className="text-xl font-bold mb-4">You Receive</h2>
              <div className="space-y-3 mb-4">
                {state.receiving.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No players selected</p>
                ) : (
                  state.receiving.map(playerId => (
                    <div
                      key={playerId}
                      className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border/50"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{getPlayerName(playerId)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getPlayerPosition(playerId)} • {getPlayerTeam(playerId)} • {getPlayerProjection(playerId).toFixed(1)} pts
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlayer(playerId, 'receiving')}
                        className="ml-2"
                      >
                        ✕
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <Button
                onClick={() => {
                  setModalMode('receiving')
                  setModalOpen(true)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="w-full"
                variant="outline"
              >
                + Add Player
              </Button>
            </Card>
          </div>

          {state.tradeResult && (
            <Card className="card-balatro p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Trade Verdict</h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${verdictColors[state.tradeResult.verdict]} border`}>
                      {state.tradeResult.verdict.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Fairness Score</div>
                    <div className="text-4xl font-bold">
                      {state.tradeResult.fairnessScore > 0 ? '+' : ''}
                      {Math.round(state.tradeResult.fairnessScore)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                    <div className="text-sm text-muted-foreground mb-1">You Give Value</div>
                    <div className="text-2xl font-bold">
                      {state.tradeResult.givingValue.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                    <div className="text-sm text-muted-foreground mb-1">You Receive Value</div>
                    <div className="text-2xl font-bold">
                      {state.tradeResult.receivingValue.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Player Breakdown</h4>
                  <div className="space-y-2">
                    {state.tradeResult.explanation.playerBreakdown.map(player => (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between text-sm bg-background/50 p-3 rounded-lg border border-border/50"
                      >
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {player.position}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${player.isGiving ? 'text-red-500' : 'text-green-500'}`}>
                            {player.isGiving ? '-' : '+'}
                            {player.vbdValue.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                  <h4 className="font-semibold mb-2">Show Your Work</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {state.tradeResult.explanation.methodology}
                  </p>
                  {state.tradeResult.explanation.caveats.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Caveats:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {state.tradeResult.explanation.caveats.map((caveat, i) => (
                          <li key={i}>• {caveat}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {state.error && (
            <Card className="card-balatro p-6 border-red-500/50 bg-red-500/10">
              <p className="text-red-700">{state.error}</p>
            </Card>
          )}

          {state.loading && (
            <Card className="card-balatro p-6 text-center">
              <p className="text-muted-foreground">Calculating fairness...</p>
            </Card>
          )}
        </div>
      </FadeIn>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'giving' ? 'Select Player to Give' : 'Select Player to Receive'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={modalMode === 'giving' ? 'Filter roster players...' : 'Search players by name...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <ScrollArea className="h-96 border rounded-lg p-4">
              <div className="space-y-2">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {modalMode === 'receiving' && !searchQuery.trim()
                      ? 'Type to search for players...'
                      : 'No players found'}
                  </p>
                ) : (
                  filteredPlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => addPlayer(player)}
                      className="w-full text-left p-3 rounded-lg border border-border/50 hover:bg-accent hover:border-accent-foreground/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{player.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {player.position} • {player.team || 'N/A'} • {(player.projected_points || 0).toFixed(1)} pts
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Kaching {...celebration} />
    </>
  )
}
