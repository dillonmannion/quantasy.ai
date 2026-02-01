'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDraftState } from '@/lib/draft'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/animation'
import { getDraftMetadata, type DraftMetadata } from '@/app/(dashboard)/draft/actions'
import type { PickValueOutput } from '@/lib/algorithms'

interface PickValueBoardProps {
  className?: string
}

export function PickValueBoard({ className }: PickValueBoardProps) {
  const { state } = useDraftState()
  const [metadata, setMetadata] = useState<DraftMetadata | null>(null)
  const [values, setValues] = useState<PickValueOutput[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all')
  const [selectedOwner, setSelectedOwner] = useState<string | 'all'>('all')
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!state.draftId) return

      setLoading(true)
      setError(null)

      try {
        // Fetch metadata and values in parallel
        const [metaDataResult, valuesResponse] = await Promise.all([
          getDraftMetadata(state.draftId),
          fetch('/api/algorithms/pick-value', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftId: state.draftId, allPicks: true }),
          }),
        ])

        setMetadata(metaDataResult)

        if (!valuesResponse.ok) {
          throw new Error('Failed to fetch pick values')
        }

        const valuesData = await valuesResponse.json()
        setValues(Array.isArray(valuesData) ? valuesData : [valuesData])
      } catch (err) {
        console.error('PickValueBoard error:', err)
        setError('Failed to load pick values. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [state.draftId])

  // Computed Grid Data
  const gridItems = useMemo(() => {
    if (!metadata || values.length === 0) return []

    const { teams, rounds, rosters } = metadata
    const items = []

    for (let i = 0; i < values.length; i++) {
      const pickNumber = i + 1
      // Calculate round (1-based)
      const round = Math.ceil(pickNumber / teams)
      // Calculate pick in round (1-based)
      const pickInRound = ((pickNumber - 1) % teams) + 1
      
      // Determine roster ID (snake draft logic)
      let rosterId: number
      if (round % 2 === 1) {
        // Odd rounds: 1 to N
        rosterId = pickInRound
      } else {
        // Even rounds: N to 1
        rosterId = teams - pickInRound + 1
      }

      const roster = rosters[rosterId]
      const ownerName = roster?.ownerName || `Team ${rosterId}`
      const pickValue = values[i]
      
      // Check if picked
      const existingPick = state.picks.find(p => p.pickNumber === pickNumber)
      const isPicked = !!existingPick

      items.push({
        pickNumber,
        round,
        pickInRound,
        notation: `${round}.${pickInRound.toString().padStart(2, '0')}`,
        rosterId,
        ownerName,
        value: pickValue?.value ?? 0,
        isPicked,
        player: existingPick ? existingPick.playerName : null
      })
    }

    return items
  }, [metadata, values, state.picks])

  // Apply Filters
  const filteredItems = useMemo(() => {
    return gridItems.filter(item => {
      if (selectedRound !== 'all' && item.round !== selectedRound) return false
      if (selectedOwner !== 'all' && item.ownerName !== selectedOwner) return false
      if (showAvailableOnly && item.isPicked) return false
      return true
    })
  }, [gridItems, selectedRound, selectedOwner, showAvailableOnly])

  const getValueColor = (val: number) => {
    if (val >= 75) return 'bg-green-500/20 border-green-500 text-green-500'
    if (val >= 25) return 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
    return 'bg-red-500/20 border-red-500 text-red-500'
  }

  if (loading && !metadata) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed p-8">
        <div className="text-muted-foreground animate-pulse">Loading pick values...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  if (!metadata) return null

  const uniqueOwners = Array.from(new Set(Object.values(metadata.rosters).map(r => r.ownerName))).sort()

  return (
    <div className={cn("space-y-4", className)} data-testid="pick-value-board">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="round-filter">
              Round: {selectedRound === 'all' ? 'All' : selectedRound}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={selectedRound === 'all'}
              onCheckedChange={() => setSelectedRound('all')}
            >
              All Rounds
            </DropdownMenuCheckboxItem>
            {Array.from({ length: metadata.rounds }, (_, i) => i + 1).map(r => (
              <DropdownMenuCheckboxItem
                key={r}
                checked={selectedRound === r}
                onCheckedChange={() => setSelectedRound(r)}
              >
                Round {r}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="owner-filter">
              Owner: {selectedOwner === 'all' ? 'All' : selectedOwner}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-64 overflow-y-auto">
            <DropdownMenuCheckboxItem
              checked={selectedOwner === 'all'}
              onCheckedChange={() => setSelectedOwner('all')}
            >
              All Owners
            </DropdownMenuCheckboxItem>
            {uniqueOwners.map(owner => (
              <DropdownMenuCheckboxItem
                key={owner}
                checked={selectedOwner === owner}
                onCheckedChange={() => setSelectedOwner(owner)}
              >
                {owner}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={showAvailableOnly ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowAvailableOnly(!showAvailableOnly)}
          data-testid="available-only-toggle"
        >
          {showAvailableOnly ? 'Show All' : 'Available Only'}
        </Button>
      </div>

      {/* Grid */}
      <div 
        className="grid gap-2 overflow-x-auto pb-4"
        style={{ 
          gridTemplateColumns: `repeat(${selectedRound === 'all' ? metadata.teams : 1}, minmax(140px, 1fr))`
        }}
        data-testid="pick-value-grid"
      >
        {filteredItems.map((item, index) => (
          <FadeIn 
            key={item.pickNumber} 
            delay={index * 0.01}
            duration={0.3}
          >
            <Card 
              className={cn(
                "h-full overflow-hidden transition-colors hover:bg-muted/50",
                item.isPicked && "opacity-60"
              )}
              data-testid="pick-card"
            >
              <CardHeader className="p-3 pb-0">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{item.notation}</span>
                  <span className="truncate max-w-[80px]" title={item.ownerName}>
                    {item.ownerName}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-2 space-y-2">
                <div className={cn(
                  "rounded-md border p-2 text-center font-bold text-lg",
                  getValueColor(item.value)
                )}>
                  {Math.round(item.value)}
                </div>
                <div className="text-xs font-medium text-center truncate min-h-[1.25rem]">
                  {item.player || "Available"}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>
    </div>
  )
}
