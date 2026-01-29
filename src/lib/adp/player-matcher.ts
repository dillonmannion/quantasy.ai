import type { SleeperPlayer } from '@/lib/sleeper/types'

const SUFFIX_PATTERNS = /\s+(Jr\.|Sr\.|II|III|IV|V)$/i
const PUNCTUATION_PATTERN = /[^\w\s]/g
const THRESHOLD = 0.75

function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length
  const matrix: number[][] = Array(aLen + 1)
    .fill(null)
    .map(() => Array(bLen + 1).fill(0))

  for (let i = 0; i <= aLen; i++) {
    matrix[i][0] = i
  }
  for (let j = 0; j <= bLen; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[aLen][bLen]
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(SUFFIX_PATTERNS, '')
    .replace(PUNCTUATION_PATTERN, '')
    .trim()
}

function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(a, b)
  return 1 - distance / maxLen
}

export function matchPlayerName(
  ffcName: string,
  sleeperPlayers: Record<string, SleeperPlayer>
): string | null {
  if (!ffcName || !ffcName.trim()) {
    return null
  }

  const normalizedFFC = normalizeName(ffcName)
  if (!normalizedFFC) {
    return null
  }

  let bestMatch: { id: string; similarity: number } | null = null

  for (const [playerId, player] of Object.entries(sleeperPlayers)) {
    const normalizedSleeper = normalizeName(player.full_name)
    const similarity = calculateSimilarity(normalizedFFC, normalizedSleeper)

    if (similarity >= THRESHOLD) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { id: playerId, similarity }
      }
    }
  }

  return bestMatch?.id ?? null
}
