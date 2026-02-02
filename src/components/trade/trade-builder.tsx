'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { PickChip } from './pick-chip'
import { PlayerPicker } from './player-picker'
import { PickSelector } from './pick-selector'
import { FairnessMeter } from './fairness-meter'
import { TradeExplanation } from './trade-explanation'
import { BiasSlider } from './bias-slider'
import type { TradeableAsset, PlayerAsset, DraftPickAsset, FutureRookiePickAsset, Position } from '@/lib/algorithms/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface TradeBuilderProps {
  allPlayers: PlayerRow[]
  onTradeSubmit?: (youGive: TradeableAsset[], youReceive: TradeableAsset[], biasFactor: number) => void
  className?: string
  leagueId?: string
  initialReceive?: TradeableAsset[]
}

export function TradeBuilder({
  allPlayers,
  onTradeSubmit,
  className,
  leagueId,
  initialReceive = []
}: TradeBuilderProps) {
  const [youGive, setYouGive] = useState<TradeableAsset[]>([])
  const [youReceive, setYouReceive] = useState<TradeableAsset[]>(initialReceive)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isPickSelectorOpen, setIsPickSelectorOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'give' | 'receive'>('give')
  const [draggedItem, setDraggedItem] = useState<TradeableAsset | null>(null)
  const [biasFactor, setBiasFactor] = useState(0)
  const [pickValues, setPickValues] = useState<Record<string, number>>({})

  const selectedPlayerIds = new Set([
    ...youGive.filter(a => a.type === 'player').map((p) => (p as PlayerAsset).playerId),
    ...youReceive.filter(a => a.type === 'player').map((p) => (p as PlayerAsset).playerId),
  ])

  const availablePlayers = allPlayers.filter(
    (p) => !selectedPlayerIds.has(p.id)
  )

  useEffect(() => {
    if (!leagueId) return

    const picks = [...youGive, ...youReceive].filter(
      item => item.type === 'draft_pick' || item.type === 'future_rookie_pick'
    ) as (DraftPickAsset | FutureRookiePickAsset)[]

    if (picks.length === 0) return

    const fetchValues = async () => {
      const newValues: Record<string, number> = {}

      for (const pick of picks) {
        try {
           if (pick.type === 'draft_pick') {
             const res = await fetch(`/api/algorithms/pick-value?draftId=mock&pickNumber=${pick.pickNumber}&biasFactor=${biasFactor}`)
             if (res.ok) {
               const data = await res.json()
               newValues[pick.pickId] = data.value
             }
           } else {
             newValues[pick.pickId] = 50 + (biasFactor * 100)
           }
        } catch (e) {
          console.error('Failed to fetch pick value', e)
        }
      }
      setPickValues(prev => ({ ...prev, ...newValues }))
    }

    const timer = setTimeout(fetchValues, 300)
    return () => clearTimeout(timer)
  }, [youGive, youReceive, biasFactor, leagueId])

  const handleAddPlayer = useCallback(
    (player: PlayerRow) => {
      const asset: PlayerAsset = {
        type: 'player',
        playerId: player.id,
        fullName: player.full_name || 'Unknown',
        position: (player.position as Position) || 'FLEX',
        projectedPoints: player.projected_points || 0
      }

      if (pickerMode === 'give') {
        setYouGive((prev) => [...prev, asset])
      } else {
        setYouReceive((prev) => [...prev, asset])
      }
      setIsPickerOpen(false)
    },
    [pickerMode]
  )
  
  const handleAddPick = useCallback(
    (pick: DraftPickAsset | FutureRookiePickAsset) => {
       if (pickerMode === 'give') {
         setYouGive(prev => [...prev, pick])
       } else {
         setYouReceive(prev => [...prev, pick])
       }
    },
    [pickerMode]
  )

  const handleRemoveItem = useCallback((id: string, mode: 'give' | 'receive') => {
    if (mode === 'give') {
      setYouGive((prev) => prev.filter((p) => {
         const itemId = p.type === 'player' ? p.playerId : p.pickId
         return itemId !== id
      }))
    } else {
      setYouReceive((prev) => prev.filter((p) => {
         const itemId = p.type === 'player' ? p.playerId : p.pickId
         return itemId !== id
      }))
    }
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const allItems = [...youGive, ...youReceive]
    const activeItem = allItems.find(p => {
       const id = p.type === 'player' ? p.playerId : p.pickId
       return id === activeId
    })
    
    if (!activeItem) return

    const isActiveInGive = youGive.some(p => (p.type === 'player' ? p.playerId : p.pickId) === activeId)
    const isOverInGive = youGive.some(p => (p.type === 'player' ? p.playerId : p.pickId) === overId)

    if (isActiveInGive === isOverInGive) {
      if (isActiveInGive) {
        const activeIndex = youGive.findIndex(p => (p.type === 'player' ? p.playerId : p.pickId) === activeId)
        const overIndex = youGive.findIndex(p => (p.type === 'player' ? p.playerId : p.pickId) === overId)
        const newGive = [...youGive]
        newGive.splice(activeIndex, 1)
        newGive.splice(overIndex, 0, activeItem)
        setYouGive(newGive)
      } else {
        const activeIndex = youReceive.findIndex(p => (p.type === 'player' ? p.playerId : p.pickId) === activeId)
        const overIndex = youReceive.findIndex(p => (p.type === 'player' ? p.playerId : p.pickId) === overId)
        const newReceive = [...youReceive]
        newReceive.splice(activeIndex, 1)
        newReceive.splice(overIndex, 0, activeItem)
        setYouReceive(newReceive)
      }
    }
    setDraggedItem(null)
  }

  const getItemId = (item: TradeableAsset) => item.type === 'player' ? item.playerId : item.pickId

  const calculateTotalValue = (items: TradeableAsset[]) => {
    return items.reduce((sum, item) => {
      if (item.type === 'player') {
        return sum + (item.projectedPoints || 0)
      } else {
        return sum + (pickValues[item.pickId] || 0)
      }
    }, 0)
  }

  const fairnessScore = calculateTotalValue(youReceive) - calculateTotalValue(youGive)

  return (
    <div className={cn('space-y-6', className)} data-testid="trade-builder">
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={(event) => {
          const item = [...youGive, ...youReceive].find(
            (p) => getItemId(p) === event.active.id
          )
          setDraggedItem(item || null)
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                 <h2 className="text-lg font-bold" data-testid="zone-give-header">You Give</h2>
                 <span className="text-xs text-muted-foreground">Total: {calculateTotalValue(youGive).toFixed(1)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="add-pick-give"
                  onClick={() => {
                    setPickerMode('give')
                    setIsPickSelectorOpen(true)
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors text-xs font-medium"
                >
                  + Pick
                </button>
                <button
                  data-testid="add-player-give"
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
            </div>

            <div className="card-balatro p-4 min-h-[200px] space-y-2" data-testid="zone-give" data-testid-section="you-give-section">
              {youGive.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-foreground" data-testid="zone-give-empty">
                  <div className="text-center">
                    <p className="text-sm font-medium">No assets selected</p>
                    <p className="text-xs text-foreground/80 mt-1">
                      Tap or drag to add
                    </p>
                  </div>
                </div>
              ) : (
                <SortableContext
                  items={youGive.map(getItemId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {youGive.map((item) => (
                      item.type === 'player' ? (
                        <PlayerChip
                          key={item.playerId}
                          player={item}
                          onRemove={() => handleRemoveItem(item.playerId, 'give')}
                          isDraggable={true}
                        />
                      ) : (
                        <PickChip
                           key={item.pickId}
                           pick={item}
                           onRemove={() => handleRemoveItem(item.pickId, 'give')}
                           isDraggable={true}
                           value={pickValues[item.pickId]}
                        />
                      )
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
              <div className="flex flex-col">
                 <h2 className="text-lg font-bold" data-testid="zone-receive-header">You Receive</h2>
                 <span className="text-xs text-muted-foreground">Total: {calculateTotalValue(youReceive).toFixed(1)}</span>
              </div>
              <div className="flex gap-2">
                 <button
                  data-testid="add-pick-receive"
                  onClick={() => {
                    setPickerMode('receive')
                    setIsPickSelectorOpen(true)
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors text-xs font-medium"
                >
                  + Pick
                </button>
                <button
                  data-testid="add-player-receive"
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
            </div>

            <div className="card-balatro p-4 min-h-[200px] space-y-2" data-testid="zone-receive" data-testid-section="you-receive-section">
              {youReceive.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-foreground" data-testid="zone-receive-empty">
                  <div className="text-center">
                    <p className="text-sm font-medium">No assets selected</p>
                    <p className="text-xs text-foreground/80 mt-1">
                      Tap or drag to add
                    </p>
                  </div>
                </div>
              ) : (
                <SortableContext
                  items={youReceive.map(getItemId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {youReceive.map((item) => (
                      item.type === 'player' ? (
                        <PlayerChip
                          key={item.playerId}
                          player={item}
                          onRemove={() => handleRemoveItem(item.playerId, 'receive')}
                          isDraggable={true}
                        />
                      ) : (
                        <PickChip
                           key={item.pickId}
                           pick={item}
                           onRemove={() => handleRemoveItem(item.pickId, 'receive')}
                           isDraggable={true}
                           value={pickValues[item.pickId]}
                        />
                      )
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </motion.div>
        </div>

        <DragOverlay>
          {draggedItem ? (
             draggedItem.type === 'player' ? (
               <PlayerChip
                player={draggedItem}
                onRemove={() => {}}
                isDraggable={false}
              />
             ) : (
                <PickChip
                  pick={draggedItem}
                  onRemove={() => {}}
                  isDraggable={false}
                  value={pickValues[draggedItem.pickId]}
                />
             )
          ) : null}
        </DragOverlay>
      </DndContext>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <BiasSlider value={biasFactor} onChange={setBiasFactor} />
        <FairnessMeter value={fairnessScore} />
      </motion.div>

      {(youGive.length > 0 || youReceive.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <TradeExplanation 
             youGive={youGive.filter(i => i.type === 'player').map(p => {
                const asset = p as PlayerAsset;
                return {
                   id: asset.playerId,
                   full_name: asset.fullName,
                   position: asset.position,
                   projected_points: asset.projectedPoints
                } as unknown as PlayerRow
             })} 
             youReceive={youReceive.filter(i => i.type === 'player').map(p => {
                const asset = p as PlayerAsset;
                 return {
                   id: asset.playerId,
                   full_name: asset.fullName,
                   position: asset.position,
                   projected_points: asset.projectedPoints
                } as unknown as PlayerRow
             })} 
          />
        </motion.div>
      )}

        {(youGive.length > 0 || youReceive.length > 0) && onTradeSubmit && (
        <motion.button
          data-testid="propose-trade-button"
          aria-label="Propose trade"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onTradeSubmit(youGive, youReceive, biasFactor)}
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

      <PickSelector
         isOpen={isPickSelectorOpen}
         onClose={() => setIsPickSelectorOpen(false)}
         onAdd={handleAddPick}
      />
    </div>
  )
}
