'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { DraftPickAsset, FutureRookiePickAsset } from '@/lib/algorithms/types'

type PickAsset = DraftPickAsset | FutureRookiePickAsset

interface PickSelectorProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (pick: PickAsset) => void
}

export function PickSelector({ isOpen, onClose, onAdd }: PickSelectorProps) {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  const [round, setRound] = useState<string>('1')
  const [pickNumber, setPickNumber] = useState<string>('1')
  const [isFuture, setIsFuture] = useState(false)

  const handleAdd = () => {
    const pickId = `pick-${Math.random().toString(36).substr(2, 9)}`
    const numRound = parseInt(round)
    const numYear = parseInt(year)
    const numPick = parseInt(pickNumber)

    if (isFuture) {
      const pick: FutureRookiePickAsset = {
        type: 'future_rookie_pick',
        pickId,
        pickNumber: 0,
        round: numRound,
        rosterId: 0,
        year: numYear,
      }
      onAdd(pick)
    } else {
      const pick: DraftPickAsset = {
        type: 'draft_pick',
        pickId,
        pickNumber: numPick,
        round: numRound,
        rosterId: 0,
        year: numYear,
        isFutureRookie: false
      }
      onAdd(pick)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Draft Pick</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
             <Button
                variant={!isFuture ? "default" : "outline"}
                onClick={() => setIsFuture(false)}
                className="flex-1"
             >
                Current Draft
             </Button>
             <Button
                variant={isFuture ? "default" : "outline"}
                onClick={() => setIsFuture(true)}
                className="flex-1"
             >
                Future Pick
             </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2].map((offset) => {
                     const y = new Date().getFullYear() + offset
                     return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Round</label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={r.toString()}>Round {r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isFuture && (
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Pick Number</label>
                <Select value={pickNumber} onValueChange={setPickNumber}>
                  <SelectTrigger data-testid="pick-number-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                      <SelectItem key={p} value={p.toString()} data-testid={`pick-option-${p}`}>Pick {p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <Button onClick={handleAdd} data-testid="add-pick-confirm">
            <Plus className="w-4 h-4 mr-2" />
            Add Pick
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
