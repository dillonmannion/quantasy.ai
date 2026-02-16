'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DraftRankings } from './draft-rankings'
import { PickValueBoard } from './pick-value-board'
import { MyTeamSidebar } from './my-team-sidebar'
import type { VBDForLeagueResult } from '@/lib/algorithms'

interface DraftViewTabsProps {
  players: VBDForLeagueResult['rankings']
}

export function DraftViewTabs({ players }: DraftViewTabsProps) {
  const [view, setView] = useState<'rankings' | 'board'>('rankings')

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        <Button 
          variant={view === 'rankings' ? 'default' : 'ghost'} 
          onClick={() => setView('rankings')}
          size="sm"
          data-testid="tab-rankings"
        >
          Rankings
        </Button>
        <Button 
          variant={view === 'board' ? 'default' : 'ghost'} 
          onClick={() => setView('board')}
          size="sm"
          data-testid="tab-board"
        >
          Pick Value Board
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="min-w-0">
          {view === 'rankings' ? (
            <DraftRankings players={players} />
          ) : (
            <PickValueBoard />
          )}
        </div>
        <MyTeamSidebar />
      </div>
    </div>
  )
}
