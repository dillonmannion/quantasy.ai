import { sleeperFetch, sleeperFetchNoCache } from './client'
import type { SleeperDraft, SleeperDraftPick } from './types'

export async function getDraft(draftId: string): Promise<SleeperDraft> {
  return sleeperFetch<SleeperDraft>(`/draft/${draftId}`)
}

export async function getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  return sleeperFetchNoCache<SleeperDraftPick[]>(`/draft/${draftId}/picks`)
}

export async function getDraftTradedPicks(draftId: string): Promise<SleeperDraftPick[]> {
  return sleeperFetchNoCache<SleeperDraftPick[]>(`/draft/${draftId}/traded_picks`)
}

export async function getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
  return sleeperFetchNoCache<SleeperDraft[]>(`/league/${leagueId}/drafts`)
}

export async function getActiveDraft(leagueId: string): Promise<SleeperDraft | null> {
  const drafts = await getLeagueDrafts(leagueId)

  const active = drafts.find((d) => d.status === 'drafting')
  if (active) return active

  const upcoming = drafts.find((d) => d.status === 'pre_draft')
  if (upcoming) return upcoming

  const completed = drafts
    .filter((d) => d.status === 'complete')
    .sort((a, b) => (b.start_time ?? 0) - (a.start_time ?? 0))
  return completed[0] ?? null
}
