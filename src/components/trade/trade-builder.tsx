'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion } from 'motion/react'
import { Plus } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { PlayerChip } from './player-chip'
import { PlayerPicker } from './player-picker'
import { FairnessMeter } from './fairness-meter'
import { TradeExplanation } from './trade-explanation'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface TradeBuilderProps {
  allPlayers: PlayerRow[]
  onTradeSubmit?: (youGive: PlayerRow[], youReceive: PlayerRow[]) => void
  className?: string
}

export function TradeBuilder({
  allPlayers,
  onTradeSubmit,
  className,
}: TradeBuilderProps) {
  const [youGive, setYouGive] = useState<PlayerRow[]>([])
  const [youReceive, setYouReceive] = useState<PlayerRow[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'give' | 'receive'>('give')
  const [draggedPlayer, setDraggedPlayer] = useState<PlayerRow | null>(null)

  const selectedPlayerIds = new Set([
    ...youGive.map((p) => p.id),
    ...youReceive.map((p) => p.id),
  ])

  const availablePlayers = allPlayers.filter(
    (p) => !selectedPlayerIds.has(p.id)
  )

  const handleAddPlayer = useCallback(
    (player: PlayerRow) => {
      if (pickerMode === 'give') {
        setYouGive((prev) => [...prev, player])
      } else {
        setYouReceive((prev) => [...prev, player])
      }
      setIsPickerOpen(false)
    },
    [pickerMode]
  )

  const handleRemovePlayer = useCallback((playerId: string, mode: 'give' | 'receive') => {
    if (mode === 'give') {
      setYouGive((prev) => prev.filter((p) => p.id !== playerId))
    } else {
      setYouReceive((prev) => prev.filter((p) => p.id !== playerId))
    }
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activePlayer = [...youGive, ...youReceive].find(
      (p) => p.id === activeId
    )
    if (!activePlayer) return

    const isActiveInGive = youGive.some((p) => p.id === activeId)
    const isOverInGive = youGive.some((p) => p.id === overId)

    if (isActiveInGive === isOverInGive) {
      if (isActiveInGive) {
        const activeIndex = youGive.findIndex((p) => p.id === activeId)
        const overIndex = youGive.findIndex((p) => p.id === overId)
        const newGive = [...youGive]
        newGive.splice(activeIndex, 1)
        newGive.splice(overIndex, 0, activePlayer)
        setYouGive(newGive)
      } else {
        const activeIndex = youReceive.findIndex((p) => p.id === activeId)
        const overIndex = youReceive.findIndex((p) => p.id === overId)
        const newReceive = [...youReceive]
        newReceive.splice(activeIndex, 1)
        newReceive.splice(overIndex, 0, activePlayer)
        setYouReceive(newReceive)
      }
    }

    setDraggedPlayer(null)
  }

  const fairnessScore = (() => {
    const givePoints = youGive.reduce(
      (sum, p) => sum + (p.projected_points ?? 0),
      0
    )
    const receivePoints = youReceive.reduce(
      (sum, p) => sum + (p.projected_points ?? 0),
      0
    )
    return receivePoints - givePoints
  })()

  return (
    <div className={cn('space-y-6', className)} data-testid="trade-builder">
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={(event) => {
          const player = [...youGive, ...youReceive].find(
            (p) => p.id === event.active.id
          )
          setDraggedPlayer(player || null)
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" data-testid="zone-give-header">You Give</h2>
              <button
                data-testid="add-player-give"
                aria-label="Add player to give"
                onClick={() => {
                  setPickerMode('give')
                  setIsPickerOpen(true)
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            <div className="card-balatro p-4 min-h-[200px] space-y-2" data-testid="zone-give">
              {youGive.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-foreground" data-testid="zone-give-empty">
                  <div className="text-center">
                    <p className="text-sm font-medium">No players selected</p>
                    <p className="text-xs text-foreground/80 mt-1">
                      Tap or drag to add
                    </p>
                  </div>
                </div>
              ) : (
                <SortableContext
                  items={youGive.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {youGive.map((player) => (
                      <PlayerChip
                        key={player.id}
                        player={player}
                        onRemove={() => handleRemovePlayer(player.id, 'give')}
                        isDraggable={true}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" data-testid="zone-receive-header">You Receive</h2>
              <button
                data-testid="add-player-receive"
                aria-label="Add player to receive"
                onClick={() => {
                  setPickerMode('receive')
                  setIsPickerOpen(true)
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            <div className="card-balatro p-4 min-h-[200px] space-y-2" data-testid="zone-receive">
              {youReceive.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-foreground" data-testid="zone-receive-empty">
                  <div className="text-center">
                    <p className="text-sm font-medium">No players selected</p>
                    <p className="text-xs text-foreground/80 mt-1">
                      Tap or drag to add
                    </p>
                  </div>
                </div>
              ) : (
                <SortableContext
                  items={youReceive.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {youReceive.map((player) => (
                      <PlayerChip
                        key={player.id}
                        player={player}
                        onRemove={() => handleRemovePlayer(player.id, 'receive')}
                        isDraggable={true}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </motion.div>
        </div>

        <DragOverlay>
          {draggedPlayer ? (
            <PlayerChip
              player={draggedPlayer}
              onRemove={() => {}}
              isDraggable={false}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <FairnessMeter value={fairnessScore} />
      </motion.div>

      {(youGive.length > 0 || youReceive.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <TradeExplanation youGive={youGive} youReceive={youReceive} />
        </motion.div>
      )}

        {(youGive.length > 0 || youReceive.length > 0) && onTradeSubmit && (
        <motion.button
          data-testid="propose-trade-button"
          aria-label="Propose trade with selected players"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onTradeSubmit(youGive, youReceive)}
          className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
        >
          Propose Trade
        </motion.button>
      )}

      <PlayerPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAdd={handleAddPlayer}
        availablePlayers={availablePlayers}
        selectedPlayerIds={selectedPlayerIds}
      />
    </div>
  )
}
