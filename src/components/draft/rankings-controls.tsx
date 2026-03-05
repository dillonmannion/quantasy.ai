'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

import { RiskSlider } from './risk-slider'

type Position = 'All' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF' | 'DL' | 'LB' | 'DB'
type SortOption = 'vbd' | 'projected' | 'adp'

interface RankingsControlsProps {
  onPositionChange: (position: Position) => void
  onHideDraftedChange: (hide: boolean) => void
  onSearchChange: (search: string) => void
  onSortChange: (sort: SortOption) => void
  onRiskChange?: (risk: number) => void
  selectedPosition: Position
  hideDrafted: boolean
  sortBy: SortOption
  riskTolerance?: number
  resultCount?: number
  totalCount?: number
}

const positions: Position[] = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB']

export function RankingsControls({
  onPositionChange,
  onHideDraftedChange,
  onSearchChange,
  onSortChange,
  onRiskChange,
  selectedPosition,
  hideDrafted,
  sortBy,
  riskTolerance,
  resultCount,
  totalCount
}: RankingsControlsProps) {
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, onSearchChange])

  return (
    <div className="space-y-4">
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {resultCount !== undefined && totalCount !== undefined
          ? `Showing ${resultCount} of ${totalCount} players`
          : 'Search results updated'}
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search players..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              data-testid="search-input"
            />
          </div>
          
          {riskTolerance !== undefined && onRiskChange && (
            <RiskSlider value={riskTolerance} onChange={onRiskChange} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={hideDrafted ? 'default' : 'outline'}
            size="sm"
            onClick={() => onHideDraftedChange(!hideDrafted)}
          >
            Hide Drafted
          </Button>

          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={sortBy === 'vbd' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onSortChange('vbd')}
              data-testid="sort-VBD"
            >
              VBD
            </Button>
            <Button
              variant={sortBy === 'projected' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onSortChange('projected')}
              data-testid="sort-Proj"
            >
              Proj
            </Button>
            <Button
              variant={sortBy === 'adp' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onSortChange('adp')}
              data-testid="sort-ADP"
            >
              ADP
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {positions.map((position) => (
          <Button
            key={position}
            variant={selectedPosition === position ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPositionChange(position)}
            data-testid={`filter-${position}`}
          >
            {position}
          </Button>
        ))}
      </div>
    </div>
  )
}
