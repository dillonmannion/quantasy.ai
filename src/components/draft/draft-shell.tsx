'use client'

import { DraftStateProvider } from '@/lib/draft'
import type { ReactNode } from 'react'

interface DraftShellProps {
  children: ReactNode
  keepers?: string[]
  draftId?: string
  status?: 'pre_draft' | 'drafting' | 'complete' | 'mock'
  userRosterId?: number
}

export function DraftShell({
  children,
  keepers = [],
  draftId,
  status = 'mock',
  userRosterId
}: DraftShellProps) {
  return (
    <DraftStateProvider
      initialKeepers={keepers}
      draftId={draftId}
      status={status}
      userRosterId={userRosterId}
    >
      {children}
    </DraftStateProvider>
  )
}
