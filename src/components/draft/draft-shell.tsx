'use client'

import { useEffect } from 'react'
import { DraftStateProvider, useDraftState } from '@/lib/draft'
import { useCelebration } from '@/hooks/use-celebration'
import { Kaching } from '@/components/animation/kaching'
import { AuctionBanner } from './auction-banner'
import { OfflineIndicator } from './offline-indicator'
import type { ReactNode } from 'react'

interface DraftShellProps {
  children: ReactNode
  keepers?: string[]
  draftId?: string
  status?: 'pre_draft' | 'drafting' | 'complete' | 'mock'
  userRosterId?: number
  isAuction?: boolean
}

function DraftShellContent({ children, isAuction }: { children: ReactNode; isAuction?: boolean }) {
  const { state } = useDraftState()
  const { isShowing, celebrate, hide } = useCelebration(3000)

  useEffect(() => {
    const TOTAL_PICKS = 15
    if (state.status === 'mock' && state.picks.length === TOTAL_PICKS) {
      celebrate('🎉', 'Draft Complete!')
    }
  }, [state.picks.length, state.status, celebrate])

  return (
    <>
      {isAuction && <AuctionBanner />}
      {children}
      <Kaching 
        show={isShowing} 
        value="🎉" 
        label="Draft Complete!"
        variant="green"
        onComplete={hide}
      />
      <OfflineIndicator />
    </>
  )
}

export function DraftShell({
  children,
  keepers = [],
  draftId,
  status = 'mock',
  userRosterId,
  isAuction = false
}: DraftShellProps) {
  return (
    <DraftStateProvider
      initialKeepers={keepers}
      draftId={draftId}
      status={status}
      userRosterId={userRosterId}
    >
      <DraftShellContent isAuction={isAuction}>{children}</DraftShellContent>
    </DraftStateProvider>
  )
}
