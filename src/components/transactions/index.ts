export * from './transaction-list'
export * from './transaction-row'
export * from './transaction-details'
export * from './transaction-history-modal'

import type { SleeperTransaction, SleeperPlayer } from '@/lib/sleeper'

export interface TransactionPlayer extends SleeperPlayer {
  rosterId: number
  name: string
}

export interface TransactionWithPlayers extends SleeperTransaction {
  resolved_adds: Record<string, TransactionPlayer> | null
  resolved_drops: Record<string, TransactionPlayer> | null
}
