import { describe, it, expect } from 'vitest'
import { matchPlayerName } from '@/lib/adp/player-matcher'
import type { SleeperPlayer } from '@/lib/sleeper/types'

function createMockSleeperPlayer(
  id: string,
  fullName: string,
  position: string = 'QB'
): SleeperPlayer {
  const [firstName, ...lastNameParts] = fullName.split(' ')
  return {
    player_id: id,
    full_name: fullName,
    first_name: firstName || '',
    last_name: lastNameParts.join(' ') || '',
    position,
    team: 'KC',
    age: 25,
    years_exp: 1,
    status: 'Active',
    injury_status: null,
    number: 0,
    height: '6-0',
    weight: '200',
    college: 'Test University',
    fantasy_positions: [position],
  }
}

describe('matchPlayerName', () => {
  describe('exact matches', () => {
    it('should match exact player name', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
      }

      const result = matchPlayerName('Patrick Mahomes', players)
      expect(result).toBe('4046')
    })

    it('should match case-insensitively', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
      }

      const result = matchPlayerName('patrick mahomes', players)
      expect(result).toBe('4046')
    })

    it('should match with extra whitespace', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
      }

      const result = matchPlayerName('  Patrick  Mahomes  ', players)
      expect(result).toBe('4046')
    })
  })

  describe('suffix handling', () => {
    it('should match names with Jr. suffix', () => {
      const players: Record<string, SleeperPlayer> = {
        '5000': createMockSleeperPlayer('5000', 'Stefon Diggs', 'WR'),
      }

      const result = matchPlayerName('Stefon Diggs Jr.', players)
      expect(result).toBe('5000')
    })

    it('should match names with Sr. suffix', () => {
      const players: Record<string, SleeperPlayer> = {
        '5001': createMockSleeperPlayer('5001', 'John Smith', 'RB'),
      }

      const result = matchPlayerName('John Smith Sr.', players)
      expect(result).toBe('5001')
    })

    it('should match names with III suffix', () => {
      const players: Record<string, SleeperPlayer> = {
        '5002': createMockSleeperPlayer('5002', 'Will Smith', 'TE'),
      }

      const result = matchPlayerName('Will Smith III', players)
      expect(result).toBe('5002')
    })

    it('should match names with II suffix', () => {
      const players: Record<string, SleeperPlayer> = {
        '5003': createMockSleeperPlayer('5003', 'Marcus Jones', 'CB'),
      }

      const result = matchPlayerName('Marcus Jones II', players)
      expect(result).toBe('5003')
    })

    it('should match names with IV suffix', () => {
      const players: Record<string, SleeperPlayer> = {
        '5004': createMockSleeperPlayer('5004', 'Test Player', 'QB'),
      }

      const result = matchPlayerName('Test Player IV', players)
      expect(result).toBe('5004')
    })
  })

  describe('fuzzy matching', () => {
    it('should match with minor spelling differences', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
      }

      const result = matchPlayerName('Patrik Mahomes', players)
      expect(result).toBe('4046')
    })

    it('should match with transposed letters', () => {
      const players: Record<string, SleeperPlayer> = {
        '5000': createMockSleeperPlayer('5000', 'Stefon Diggs', 'WR'),
      }

      const result = matchPlayerName('Stfeon Diggs', players)
      expect(result).toBe('5000')
    })

    it('should match with one character difference', () => {
      const players: Record<string, SleeperPlayer> = {
        '5001': createMockSleeperPlayer('5001', 'Josh Allen', 'QB'),
      }

      const result = matchPlayerName('Josh Alen', players)
      expect(result).toBe('5001')
    })

    it('should not match with too many differences', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
      }

      const result = matchPlayerName('Tom Brady', players)
      expect(result).toBeNull()
    })
  })

  describe('no match scenarios', () => {
    it('should return null when no players provided', () => {
      const result = matchPlayerName('Patrick Mahomes', {})
      expect(result).toBeNull()
    })

    it('should return null when no close match found', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
      }

      const result = matchPlayerName('Completely Different Name', players)
      expect(result).toBeNull()
    })

    it('should return null for empty search string', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
      }

      const result = matchPlayerName('', players)
      expect(result).toBeNull()
    })
  })

  describe('multiple players', () => {
    it('should return best match among multiple players', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
        '5000': createMockSleeperPlayer('5000', 'Patrick Mahomes II', 'WR'),
        '5001': createMockSleeperPlayer('5001', 'Josh Allen', 'QB'),
      }

      const result = matchPlayerName('Patrick Mahomes', players)
      expect(result).toBe('4046')
    })

    it('should prefer exact match over fuzzy match', () => {
      const players: Record<string, SleeperPlayer> = {
        '4046': createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB'),
        '5000': createMockSleeperPlayer('5000', 'Patrik Mahomes', 'WR'),
      }

      const result = matchPlayerName('Patrick Mahomes', players)
      expect(result).toBe('4046')
    })

    it('should handle large player database', () => {
      const players: Record<string, SleeperPlayer> = {}
      for (let i = 0; i < 1000; i++) {
        players[`${i}`] = createMockSleeperPlayer(
          `${i}`,
          `Player ${i}`,
          'QB'
        )
      }
      players['4046'] = createMockSleeperPlayer('4046', 'Patrick Mahomes', 'QB')

      const result = matchPlayerName('Patrick Mahomes', players)
      expect(result).toBe('4046')
    })
  })

  describe('edge cases', () => {
    it('should handle names with punctuation', () => {
      const players: Record<string, SleeperPlayer> = {
        '5000': createMockSleeperPlayer('5000', "D'Andre Swift", 'RB'),
      }

      const result = matchPlayerName("D'Andre Swift", players)
      expect(result).toBe('5000')
    })

    it('should handle names with hyphens', () => {
      const players: Record<string, SleeperPlayer> = {
        '5001': createMockSleeperPlayer('5001', 'Ja-Marr Chase', 'WR'),
      }

      const result = matchPlayerName('Ja-Marr Chase', players)
      expect(result).toBe('5001')
    })

    it('should handle single name players', () => {
      const players: Record<string, SleeperPlayer> = {
        '5002': createMockSleeperPlayer('5002', 'Amon-Ra', 'WR'),
      }

      const result = matchPlayerName('Amon-Ra', players)
      expect(result).toBe('5002')
    })

    it('should normalize punctuation in matching', () => {
      const players: Record<string, SleeperPlayer> = {
        '5000': createMockSleeperPlayer('5000', "D'Andre Swift", 'RB'),
      }

      const result = matchPlayerName('DAndre Swift', players)
      expect(result).toBe('5000')
    })

    it('should handle empty normalized names', () => {
      const players: Record<string, SleeperPlayer> = {
        '5000': createMockSleeperPlayer('5000', '!!!', 'RB'),
      }

      const result = matchPlayerName('Patrick Mahomes', players)
      expect(result).toBeNull()
    })
  })
})
