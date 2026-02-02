#!/usr/bin/env npx tsx
/**
 * LIVE TRADE EVALUATOR - Run: npx tsx scripts/live-trade-eval.ts "giving" "receiving"
 * Supports: Players, live draft picks, future picks (2027+)
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'

// ============================================================================
// ANSI COLOR CONSTANTS
// ============================================================================
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RED = '\x1b[31m'
const DIM = '\x1b[2m'
const MAGENTA = '\x1b[35m'

// ============================================================================
// CONSTANTS
// ============================================================================
const LEAGUE_ID = '1322376014428397568'
const BASE_URL = 'https://api.sleeper.app/v1'
const CURRENT_YEAR = 2026

const POS_COLORS: Record<string, string> = {
  QB: MAGENTA,
  RB: GREEN,
  WR: '\x1b[34m',
  TE: YELLOW,
  K: CYAN,
  DEF: RED,
  PICK: DIM,
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
interface RankedPlayer {
  rank: number
  name: string
  team: string
  position: string
  playerId?: string
  value?: number
}

interface SleeperPlayer {
  player_id: string
  full_name: string
  first_name: string
  last_name: string
  position: string
  team: string | null
  status: string
  search_rank: number | null
}

interface SleeperDraft {
  draft_id: string
  settings: { rounds: number; teams: number; reversal_round: number }
  draft_order: Record<string, number>
  slot_to_roster_id: Record<string, number>
  status: string
  type: 'snake' | 'linear' | 'auction'
}

interface SleeperDraftPick {
  pick_no: number
  player_id: string
  roster_id: number
  round: number
  draft_slot: number
  metadata: { position?: string; team?: string; first_name?: string; last_name?: string }
}

interface TradedPick {
  round: number
  season: string
  roster_id: number
  owner_id: number
  previous_owner_id: number
}

interface Asset {
  type: 'player' | 'live_pick' | 'future_pick'
  name: string
  value: number
  rank?: string
  position?: string
  pickNo?: number
  round?: number
  year?: number
}

interface DraftState {
  draft: SleeperDraft | null
  picks: SleeperDraftPick[]
  tradedPicks: TradedPick[]
  allPlayers: Record<string, SleeperPlayer>
}

interface TradeResult {
  giving: Asset[]
  receiving: Asset[]
  givingTotal: number
  receivingTotal: number
  netValue: number
  fairness: number
  verdict: string
}

// ============================================================================
// VALUE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate player value based on rank (tiered formula)
 * Tier 1 (1-24): Elite players - 1500 to 1000
 * Tier 2 (25-75): Solid starters - 1000 to 400
 * Tier 3 (76-150): Depth pieces - 400 to 50
 * Tier 4 (151+): Replacement level - 50 to 10
 */
function getPlayerValue(rank: number): number {
  // Tier 1 (1-24): Elite players - 1500 to 1000
  if (rank <= 24) {
    return Math.floor(1500 - ((rank - 1) * 500 / 23))
  }
  // Tier 2 (25-75): Solid starters - 1000 to 400
  if (rank <= 75) {
    return Math.floor(1000 - ((rank - 25) * 600 / 50))
  }
  // Tier 3 (76-150): Depth pieces - 400 to 50
  if (rank <= 150) {
    return Math.floor(400 - ((rank - 76) * 350 / 74))
  }
  // Tier 4 (151+): Replacement level - 50 to 10
  return Math.max(Math.floor(50 - ((rank - 151) * 0.5)), 10)
}

/**
 * Calculate draft pick value (exponential decay)
 */
function getPickValue(round: number): number {
  const baseValue = 1000
  const decay = 0.75
  return Math.floor(baseValue * Math.pow(decay, round - 1))
}

/**
 * Calculate future pick value with yearly discount
 */
function getFuturePickValue(round: number, yearsOut: number): number {
  const basePickValue = getPickValue(round)
  const yearlyDiscount = 0.85
  return Math.floor(basePickValue * Math.pow(yearlyDiscount, yearsOut))
}

/**
 * Get trade verdict based on score
 */
function getVerdict(score: number): { text: string; color: string } {
  if (score >= 50) return { text: 'GREAT TRADE', color: GREEN }
  if (score >= 10) return { text: 'GOOD TRADE', color: GREEN }
  if (score >= -10) return { text: 'FAIR TRADE', color: YELLOW }
  if (score >= -50) return { text: 'BAD TRADE', color: RED }
  return { text: 'VETO-WORTHY', color: RED }
}

// ============================================================================
// SLEEPER API INTEGRATION
// ============================================================================

/**
 * Fetch data from Sleeper API
 */
async function fetchSleeper<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`)
  if (!response.ok) throw new Error(`Sleeper API error: ${response.status}`)
  return response.json()
}

/**
 * Calculate overall pick number for snake/linear drafts
 */
function calculateOverallPick(round: number, slot: number, teams: number, draftType: string, reversalRound: number): number {
  if (draftType === 'linear') {
    return (round - 1) * teams + slot
  }
  const isReversed = round >= reversalRound && (round - reversalRound) % 2 === 1
  if (isReversed) {
    return (round - 1) * teams + (teams - slot + 1)
  }
  return (round - 1) * teams + slot
}

/**
 * Fetch draft state from Sleeper API
 */
async function fetchDraftState(): Promise<DraftState> {
  const drafts = await fetchSleeper<SleeperDraft[]>(`/league/${LEAGUE_ID}/drafts`)
  const activeDraft = drafts.find(d => d.status === 'drafting') || drafts.find(d => d.status === 'paused') || drafts[0]

  if (!activeDraft) {
    return { draft: null, picks: [], tradedPicks: [], allPlayers: {} }
  }

  const [draft, picks, tradedPicks, allPlayers] = await Promise.all([
    fetchSleeper<SleeperDraft>(`/draft/${activeDraft.draft_id}`),
    fetchSleeper<SleeperDraftPick[]>(`/draft/${activeDraft.draft_id}/picks`),
    fetchSleeper<TradedPick[]>(`/league/${LEAGUE_ID}/traded_picks`),
    fetchSleeper<Record<string, SleeperPlayer>>('/players/nfl'),
  ])

  return { draft, picks, tradedPicks, allPlayers }
}

// ============================================================================
// CSV PARSING & PLAYER MATCHING
// ============================================================================

/**
 * Parse FantasyPros CSV with multi-line cell support
 */
function parseFantasyProsCSV(filePath: string): RankedPlayer[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const players: RankedPlayer[] = []
  let currentRow: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed) currentRow.push(trimmed)
    if (trimmed.endsWith('"')) {
      const row = currentRow.join(' ')
      const values = row.match(/"([^"]+)"/g)?.map((v) => v.replace(/"/g, '').trim()) || []
      if (values.length >= 4 && values[0] !== 'RK') {
        const rank = parseInt(values[0], 10)
        players.push({
          rank,
          name: values[1],
          team: values[2],
          position: values[3],
          value: getPlayerValue(rank),
        })
      }
      currentRow = []
    }
  }
  return players
}

/**
 * Normalize player name for matching
 */
function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/iii?$/, '')
    .replace(/jr$/, '')
    .replace(/sr$/, '')
}

/**
 * Match ranked players to Sleeper player IDs
 */
function matchPlayersToSleeper(rankings: RankedPlayer[], sleeperPlayers: Record<string, SleeperPlayer>): RankedPlayer[] {
  const sleeperByNamePos: Record<string, string> = {}
  const sleeperByName: Record<string, string> = {}

  for (const [id, p] of Object.entries(sleeperPlayers)) {
    if (p.full_name) {
      const norm = normalizePlayerName(p.full_name)
      const key = `${norm}_${p.position}`
      if (!sleeperByNamePos[key] || p.team) {
        sleeperByNamePos[key] = id
      }
      if (!sleeperByName[norm] || p.team) {
        sleeperByName[norm] = id
      }
    }
  }

  return rankings.map((r) => {
    const normalized = normalizePlayerName(r.name)
    const keyWithPos = `${normalized}_${r.position}`
    const playerId = sleeperByNamePos[keyWithPos] || sleeperByName[normalized]
    return { ...r, playerId }
  })
}

/**
 * Find player by fuzzy matching
 */
function findPlayer(query: string, players: RankedPlayer[]): RankedPlayer | null {
  const normalized = normalizePlayerName(query)

  let bestMatch: RankedPlayer | null = null
  let bestScore = 0

  for (const player of players) {
    const playerNorm = normalizePlayerName(player.name)

    if (playerNorm === normalized) return player

    if (playerNorm.includes(normalized) || normalized.includes(playerNorm)) {
      const score = Math.min(playerNorm.length, normalized.length)
      if (score > bestScore) {
        bestScore = score
        bestMatch = player
      }
    }

    const queryParts = normalized.split(' ').filter(Boolean)
    const playerParts = playerNorm.split(' ').filter(Boolean)
    const matchedParts = queryParts.filter(q => playerParts.some(p => p.includes(q) || q.includes(p)))
    if (matchedParts.length >= 2 && matchedParts.length > bestScore) {
      bestScore = matchedParts.length
      bestMatch = player
    }
  }

  return bestMatch
}

// ============================================================================
// ASSET PARSING
// ============================================================================

/**
 * Parse a player name asset
 * Checks drafted players first, then falls back to FantasyPros rankings
 */
function parsePlayerAsset(
  input: string,
  rankings: RankedPlayer[],
  draftedPlayers: Map<string, { name: string; position: string; pickNo: number; rank: number | null }>
): Asset | null {
  const normalized = normalizePlayerName(input)

  for (const [, player] of Array.from(draftedPlayers)) {
    if (normalizePlayerName(player.name) === normalized) {
      const fpPlayer = rankings.find(r => normalizePlayerName(r.name) === normalized)
      const value = fpPlayer?.value || getPlayerValue(player.rank ?? 200)
      return {
        type: 'player',
        name: player.name,
        value,
        rank: fpPlayer ? `#${fpPlayer.rank}` : `Draft #${player.pickNo}`,
        position: player.position,
      }
    }
  }

  const player = findPlayer(input, rankings)
  if (player) {
    return {
      type: 'player',
      name: player.name,
      value: player.value || getPlayerValue(player.rank),
      rank: `#${player.rank}`,
      position: player.position,
    }
  }

  return null
}

/**
 * Parse a live draft pick reference
 * Formats: "pick 35", "#67", "3.05", "round 4"
 */
function parseLivePickAsset(input: string, draftState: DraftState): Asset | null {
  if (!draftState.draft) return null

  const lower = input.toLowerCase().trim()
  const { teams, rounds, reversal_round } = draftState.draft.settings
  const draftType = draftState.draft.type
  const pickedPickNos = new Set(draftState.picks.map(p => p.pick_no))

  let pickNo: number | null = null
  let round: number | null = null

  const overallMatch = lower.match(/(?:pick\s*)?#?(\d+)/)
  if (overallMatch && !lower.includes('.')) {
    const num = parseInt(overallMatch[1], 10)
    if (num >= 1 && num <= rounds * teams) {
      pickNo = num
      round = Math.ceil(pickNo / teams)
    }
  }

  const slotMatch = lower.match(/^(\d+)\.(\d+)$/)
  if (slotMatch) {
    const r = parseInt(slotMatch[1], 10)
    const slot = parseInt(slotMatch[2], 10)
    if (r >= 1 && r <= rounds && slot >= 1 && slot <= teams) {
      pickNo = calculateOverallPick(r, slot, teams, draftType, reversal_round)
      round = r
    }
  }

  const roundMatch = lower.match(/round\s*(\d+)/)
  if (roundMatch && !pickNo) {
    round = parseInt(roundMatch[1], 10)
    return {
      type: 'live_pick',
      name: `Round ${round} Pick`,
      value: getPickValue(round),
      round,
    }
  }

  if (pickNo === null) return null

  if (pickedPickNos.has(pickNo)) {
    console.log(`${YELLOW}Warning: Pick #${pickNo} has already been made${RESET}`)
    return null
  }

  return {
    type: 'live_pick',
    name: `Pick #${pickNo} (Round ${round})`,
    value: getPickValue(round!),
    pickNo,
    round: round!,
  }
}

/**
 * Parse a future pick reference
 * Formats: "2027 1st", "2027 2nd", "2028 3rd", "2027 first"
 */
function parseFuturePickAsset(input: string): Asset | null {
  const lower = input.toLowerCase().trim()

  const yearMatch = lower.match(/20(\d{2})/)
  if (!yearMatch) return null

  const year = parseInt(`20${yearMatch[1]}`, 10)

  if (year <= CURRENT_YEAR) return null

  const yearsOut = year - CURRENT_YEAR
  const withoutYear = lower.replace(/20\d{2}/, '').trim()

  const roundPatterns: Record<string, number> = {
    '1st': 1,
    'first': 1,
    '1': 1,
    '2nd': 2,
    'second': 2,
    '2': 2,
    '3rd': 3,
    'third': 3,
    '3': 3,
    '4th': 4,
    'fourth': 4,
    '4': 4,
    '5th': 5,
    'fifth': 5,
    '5': 5,
  }

  let round: number | null = null
  for (const [pattern, r] of Object.entries(roundPatterns)) {
    if (withoutYear.includes(pattern)) {
      round = r
      break
    }
  }

  if (round === null) return null

  const value = getFuturePickValue(round, yearsOut)
  const roundStr = round === 1 ? '1st' : round === 2 ? '2nd' : round === 3 ? '3rd' : `${round}th`

  return {
    type: 'future_pick',
    name: `${year} ${roundStr} Round Pick`,
    value,
    round,
    year,
  }
}

/**
 * Parse any asset type - tries future pick, then live pick, then player
 */
function parseAsset(
  input: string,
  rankings: RankedPlayer[],
  draftState: DraftState,
  draftedPlayers: Map<string, { name: string; position: string; pickNo: number; rank: number | null }>
): Asset | null {
  const futurePick = parseFuturePickAsset(input)
  if (futurePick) return futurePick

  const livePick = parseLivePickAsset(input, draftState)
  if (livePick) return livePick

  return parsePlayerAsset(input, rankings, draftedPlayers)
}

// ============================================================================
// TRADE EVALUATION
// ============================================================================

/**
 * Evaluate a trade between two sets of assets
 */
function evaluateTrade(givingAssets: Asset[], receivingAssets: Asset[]): {
  givingTotal: number
  receivingTotal: number
  netValue: number
  fairnessScore: number
  verdict: { text: string; color: string }
} {
  const givingTotal = givingAssets.reduce((sum, a) => sum + a.value, 0)
  const receivingTotal = receivingAssets.reduce((sum, a) => sum + a.value, 0)
  const netValue = receivingTotal - givingTotal

  const maxAbs = Math.max(Math.abs(givingTotal), Math.abs(receivingTotal))
  const fairnessScore = maxAbs === 0 ? 0 : (netValue / maxAbs) * 100

  return {
    givingTotal,
    receivingTotal,
    netValue,
    fairnessScore,
    verdict: getVerdict(fairnessScore),
  }
}

// ============================================================================
// INTERACTIVE FUZZY MATCHING
// ============================================================================

/**
 * Prompt user to confirm fuzzy match
 */
async function promptFuzzyMatch(query: string, bestMatch: RankedPlayer): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${YELLOW}Did you mean "${bestMatch.name}"? (y/n): ${RESET}`, (answer) => {
      rl.close()
      resolve(answer.toLowerCase().startsWith('y'))
    })
  })
}

/**
 * Parse a player name asset with interactive fuzzy matching
 */
async function parsePlayerAssetInteractive(
  input: string,
  rankings: RankedPlayer[],
  draftedPlayers: Map<string, { name: string; position: string; pickNo: number; rank: number | null }>
): Promise<Asset | null> {
  const normalized = normalizePlayerName(input)

  for (const [, player] of Array.from(draftedPlayers)) {
    if (normalizePlayerName(player.name) === normalized) {
      const fpPlayer = rankings.find(r => normalizePlayerName(r.name) === normalized)
      const value = fpPlayer?.value || getPlayerValue(player.rank ?? 200)
      return {
        type: 'player',
        name: player.name,
        value,
        rank: fpPlayer ? `#${fpPlayer.rank}` : `Draft #${player.pickNo}`,
        position: player.position,
      }
    }
  }

  const exactMatch = rankings.find(r => normalizePlayerName(r.name) === normalized)
  if (exactMatch) {
    return {
      type: 'player',
      name: exactMatch.name,
      value: exactMatch.value || getPlayerValue(exactMatch.rank),
      rank: `#${exactMatch.rank}`,
      position: exactMatch.position,
    }
  }

  const fuzzyMatch = findPlayer(input, rankings)
  if (fuzzyMatch) {
    const confirmed = await promptFuzzyMatch(input, fuzzyMatch)
    if (confirmed) {
      return {
        type: 'player',
        name: fuzzyMatch.name,
        value: fuzzyMatch.value || getPlayerValue(fuzzyMatch.rank),
        rank: `#${fuzzyMatch.rank}`,
        position: fuzzyMatch.position,
      }
    }
  }

  return null
}

/**
 * Parse any asset type with interactive fuzzy matching
 */
async function parseAssetInteractive(
  input: string,
  rankings: RankedPlayer[],
  draftState: DraftState,
  draftedPlayers: Map<string, { name: string; position: string; pickNo: number; rank: number | null }>
): Promise<Asset | null> {
  const futurePick = parseFuturePickAsset(input)
  if (futurePick) return futurePick

  const livePick = parseLivePickAsset(input, draftState)
  if (livePick) return livePick

  return parsePlayerAssetInteractive(input, rankings, draftedPlayers)
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`${BOLD}${CYAN}========================================${RESET}`)
    console.log(`${BOLD}${CYAN}    QUANTASY LIVE TRADE EVALUATOR${RESET}`)
    console.log(`${BOLD}${CYAN}========================================${RESET}`)
    console.log(`${DIM}Evaluate dynasty trades with live draft integration${RESET}\n`)

    console.log(`${YELLOW}Usage:${RESET}`)
    console.log(`  npx tsx scripts/live-trade-eval.ts "giving" "receiving"\n`)

    console.log(`${YELLOW}Examples:${RESET}`)
    console.log(`  ${DIM}# Trade future pick for player${RESET}`)
    console.log(`  npx tsx scripts/live-trade-eval.ts "2027 1st" "Josh Allen"`)
    console.log()
    console.log(`  ${DIM}# Trade multiple live picks for future pick${RESET}`)
    console.log(`  npx tsx scripts/live-trade-eval.ts "pick 35, pick 67" "2027 1st"`)
    console.log()
    console.log(`  ${DIM}# Complex trade with players and picks${RESET}`)
    console.log(`  npx tsx scripts/live-trade-eval.ts "Lamar Jackson, 2027 2nd" "pick 34, Caleb Williams"`)
    console.log()
    console.log(`  ${DIM}# Using round.slot notation${RESET}`)
    console.log(`  npx tsx scripts/live-trade-eval.ts "4.05, 5.03" "3.01"`)
    console.log()

    console.log(`${YELLOW}Supported Formats:${RESET}`)
    console.log(`  ${BOLD}Players${RESET}      ${DIM}Name from FantasyPros rankings${RESET}`)
    console.log(`               Josh Allen, Ja'Marr Chase, Travis Kelce`)
    console.log()
    console.log(`  ${BOLD}Live Picks${RESET}   ${DIM}Current draft picks (not yet made)${RESET}`)
    console.log(`               pick 35, #67, 4.05 (round.slot)`)
    console.log()
    console.log(`  ${BOLD}Future Picks${RESET} ${DIM}Rookie picks for future years${RESET}`)
    console.log(`               2027 1st, 2027 2nd, 2028 3rd`)
    console.log()

    console.log(`${YELLOW}Value Scale:${RESET}`)
    console.log(`  ${DIM}Players:${RESET}      FP#1 = 1500, FP#24 = 1000, FP#50 = 700, FP#100 = 286`)
    console.log(`  ${DIM}Live Picks:${RESET}   R1 = 1000, R2 = 750, R3 = 562, R4 = 421 (0.75× decay)`)
    console.log(`  ${DIM}Future Picks:${RESET} 2027 = 85% of current, 2028 = 72% (0.85× per year)`)
    console.log()

    console.log(`${YELLOW}Verdicts:${RESET}`)
    console.log(`  ${GREEN}GREAT TRADE${RESET}   ${DIM}+50% or more value${RESET}`)
    console.log(`  ${GREEN}GOOD TRADE${RESET}    ${DIM}+10% to +49% value${RESET}`)
    console.log(`  ${YELLOW}FAIR TRADE${RESET}    ${DIM}-9% to +9% value${RESET}`)
    console.log(`  ${RED}BAD TRADE${RESET}     ${DIM}-10% to -49% value${RESET}`)
    console.log(`  ${RED}VETO-WORTHY${RESET}   ${DIM}-50% or worse${RESET}`)
    console.log()

    console.log(`${DIM}League: The Big Dawg Dynasty League (${LEAGUE_ID})${RESET}`)
    console.log(`${DIM}Rankings: FantasyPros 2026 Dynasty Superflex${RESET}`)
    return
  }

  const givingInput = args[0].split(',').map(s => s.trim()).filter(Boolean)
  const receivingInput = args[1].split(',').map(s => s.trim()).filter(Boolean)

  console.log(`${DIM}Loading draft state and rankings...${RESET}`)
  const csvPath = join(process.cwd(), 'data', 'FantasyPros_2026_Dynasty_Superflex_Rankings.csv')
  const rankings = parseFantasyProsCSV(csvPath)

  const state = await fetchDraftState()
  if (!state.draft) {
    console.log(`${RED}Error: No active draft found for league${RESET}`)
    return
  }

  const draftedPlayers = new Map<string, { name: string; position: string; pickNo: number; rank: number | null }>()
  for (const pick of state.picks) {
    const sleeperPlayer = state.allPlayers[pick.player_id]
    if (sleeperPlayer) {
      const fpPlayer = rankings.find(r => normalizePlayerName(r.name) === normalizePlayerName(sleeperPlayer.full_name))
      draftedPlayers.set(pick.player_id, {
        name: sleeperPlayer.full_name,
        position: sleeperPlayer.position,
        pickNo: pick.pick_no,
        rank: fpPlayer?.rank ?? null,
      })
    }
  }

  const givingAssets: Asset[] = []
  const receivingAssets: Asset[] = []

  console.log()

  for (const input of givingInput) {
    const asset = await parseAssetInteractive(input, rankings, state, draftedPlayers)
    if (asset) {
      givingAssets.push(asset)
    } else {
      console.log(`${RED}Could not parse: "${input}"${RESET}`)
    }
  }

  for (const input of receivingInput) {
    const asset = await parseAssetInteractive(input, rankings, state, draftedPlayers)
    if (asset) {
      receivingAssets.push(asset)
    } else {
      console.log(`${RED}Could not parse: "${input}"${RESET}`)
    }
  }

  if (givingAssets.length === 0 || receivingAssets.length === 0) {
    console.log(`${RED}Error: Need at least one valid asset on each side${RESET}`)
    return
  }

  const result = evaluateTrade(givingAssets, receivingAssets)

  console.log(`\n${BOLD}${CYAN}========================================${RESET}`)
  console.log(`${BOLD}${CYAN}    QUANTASY LIVE TRADE EVALUATOR${RESET}`)
  console.log(`${BOLD}${CYAN}========================================${RESET}`)
  console.log(`${DIM}Draft: ${state.draft.status.toUpperCase()} | Pick ${state.picks.length + 1}/${state.draft.settings.rounds * state.draft.settings.teams}${RESET}\n`)

  console.log(`${RED}${BOLD}GIVING:${RESET}`)
  for (const asset of givingAssets) {
    const posColor = POS_COLORS[asset.position || 'PICK'] || DIM
    const posStr = asset.position || asset.type.toUpperCase().replace('_', ' ')
    console.log(`  ${posColor}${posStr.padEnd(5)}${RESET} ${asset.name.padEnd(28)} ${DIM}${(asset.rank || '').padStart(8)}${RESET}  Value: ${CYAN}${asset.value}${RESET}`)
  }
  console.log(`  ${'─'.repeat(55)}`)
  console.log(`  ${BOLD}TOTAL:${RESET} ${RED}${result.givingTotal}${RESET}\n`)

  console.log(`${GREEN}${BOLD}RECEIVING:${RESET}`)
  for (const asset of receivingAssets) {
    const posColor = POS_COLORS[asset.position || 'PICK'] || DIM
    const posStr = asset.position || asset.type.toUpperCase().replace('_', ' ')
    console.log(`  ${posColor}${posStr.padEnd(5)}${RESET} ${asset.name.padEnd(28)} ${DIM}${(asset.rank || '').padStart(8)}${RESET}  Value: ${CYAN}${asset.value}${RESET}`)
  }
  console.log(`  ${'─'.repeat(55)}`)
  console.log(`  ${BOLD}TOTAL:${RESET} ${GREEN}${result.receivingTotal}${RESET}\n`)

  console.log(`${BOLD}========================================${RESET}`)
  console.log(`${BOLD}NET VALUE:${RESET} ${result.netValue >= 0 ? GREEN : RED}${result.netValue >= 0 ? '+' : ''}${result.netValue}${RESET}`)
  console.log(`${BOLD}FAIRNESS:${RESET} ${result.fairnessScore >= 0 ? GREEN : RED}${result.fairnessScore.toFixed(1)}%${RESET}`)
  console.log(`${BOLD}VERDICT:${RESET} ${result.verdict.color}${result.verdict.text}${RESET}`)
  console.log(`${BOLD}========================================${RESET}`)

  if (result.netValue > 0) {
    console.log(`\n${GREEN}You're winning this trade by ${result.netValue} dynasty value points.${RESET}`)
  } else if (result.netValue < 0) {
    console.log(`\n${RED}You're losing this trade by ${Math.abs(result.netValue)} dynasty value points.${RESET}`)
  } else {
    console.log(`\n${YELLOW}This trade is perfectly even.${RESET}`)
  }
}

main().catch(console.error)
