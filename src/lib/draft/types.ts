export interface DraftState {
  draftId: string | null
  status: 'pre_draft' | 'drafting' | 'complete' | 'mock'
  picks: DraftPick[]
  draftedPlayerIds: Set<string>
  userRosterId: number | null
  currentPick: number
  userId: string | null
}

export interface DraftPick {
  pickNumber: number
  playerId: string
  playerName: string
  position: string
  rosterId: number
  timestamp: number
}

export type DraftAction =
  | { type: 'MARK_DRAFTED'; playerId: string; playerName: string; position: string; rosterId: number }
  | { type: 'UNDO_LAST_PICK' }
  | { type: 'LOAD_KEEPERS'; playerIds: string[] }
  | { type: 'SYNC_PICKS'; picks: DraftPick[] }
  | { type: 'RESET' }
