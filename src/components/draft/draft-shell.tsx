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

  const TOTAL_PICKS = 15
  const isDraftComplete = state.status === 'mock' && state.picks.length >= TOTAL_PICKS

  useEffect(() => {
    if (isDraftComplete) {
      celebrate('🎉', 'Draft Complete!')
    }
  }, [isDraftComplete, celebrate])

  return (
    <>
      {isAuction && <AuctionBanner />}
      {children}
      {isDraftComplete && (
        <div data-testid="draft-complete" className="sr-only">
          Draft Complete
        </div>
      )}
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
