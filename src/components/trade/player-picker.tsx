'use client'

import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion, AnimatePresence } from 'motion/react'
import { Search, X } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface PlayerPickerProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (player: PlayerRow) => void
  availablePlayers: PlayerRow[]
  selectedPlayerIds: Set<string>
}

const positionColors: Record<string, string> = {
  QB: 'text-red-400 bg-red-400/20',
  RB: 'text-green-400 bg-green-400/20',
  WR: 'text-blue-400 bg-blue-400/20',
  TE: 'text-yellow-400 bg-yellow-400/20',
  K: 'text-purple-400 bg-purple-400/20',
  DEF: 'text-orange-400 bg-orange-400/20',
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export function PlayerPicker({
  isOpen,
  onClose,
  onAdd,
  availablePlayers,
  selectedPlayerIds,
}: PlayerPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const filteredPlayers = useMemo(() => {
    return availablePlayers.filter((player) => {
      const matchesSearch =
        !searchQuery ||
        player.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPosition = !selectedPosition || player.position === selectedPosition

      const notSelected = !selectedPlayerIds.has(player.id)

      return matchesSearch && matchesPosition && notSelected
    })
  }, [searchQuery, selectedPosition, availablePlayers, selectedPlayerIds])

  const rowVirtualizer = useVirtualizer({
    count: filteredPlayers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  })

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-background w-full md:w-full md:max-w-2xl md:rounded-lg rounded-t-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          data-testid="player-picker-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur">
            <h2 className="text-lg font-bold" data-testid="player-picker-title">Add Player</h2>
            <button
              onClick={onClose}
              className="text-[#a1a1aa] hover:text-foreground transition-colors rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close player picker"
              data-testid="player-picker-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                aria-label="Search players"
                data-testid="player-picker-search"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            {/* Position Filter */}
            <div className="flex flex-wrap gap-2" data-testid="player-picker-filters">
              <button
                onClick={() => setSelectedPosition(null)}
                aria-pressed={selectedPosition === null}
                data-testid="filter-All"
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                  selectedPosition === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-[#a1a1aa] hover:bg-muted/80'
                  )}
                >
                  All
                </button>
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setSelectedPosition(pos)}
                    aria-pressed={selectedPosition === pos}
                    data-testid={`filter-${pos}`}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                      selectedPosition === pos
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-[#a1a1aa] hover:bg-muted/80'
                    )}
                  >
                    {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Player List - Virtualized */}
          <div
            ref={parentRef}
            className="flex-1 overflow-y-auto"
            data-testid="player-picker-list"
          >
            {filteredPlayers.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-foreground/80" data-testid="player-picker-empty">
                No players found
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const player = filteredPlayers[virtualRow.index]
                  return (
                    <motion.button
                      key={player.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      onClick={() => {
                        onAdd(player)
                        setSearchQuery('')
                      }}
                      aria-label={`Add ${player.full_name} to trade`}
                      data-testid="player-picker-item"
                      className="p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary border-b border-border"
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded flex items-center justify-center text-sm font-bold shrink-0',
                          positionColors[player.position ?? ''] ??
                            'text-gray-400 bg-gray-400/20'
                        )}
                      >
                        {player.first_name?.[0]}
                        {player.last_name?.[0]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{player.full_name}</div>
                        <div className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-semibold',
                              positionColors[player.position ?? ''] ??
                                'text-gray-400 bg-gray-400/20'
                            )}
                          >
                            {player.position}
                          </span>
                          {player.team && <span>{player.team}</span>}
                        </div>
                      </div>

                      {player.projected_points !== null && (
                        <div className="text-right shrink-0">
                          <div className="font-bold text-accent">
                            {player.projected_points.toFixed(1)}
                          </div>
                          <div className="text-xs text-[#a1a1aa]">pts</div>
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
