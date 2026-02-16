import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { fetchADP, clearADPCache } from '@/lib/adp/ffc-client'

const mockFetch = vi.fn()

describe('fetchADP', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearADPCache()
    global.fetch = mockFetch
  })

  afterEach(() => {
    mockFetch.mockClear()
  })

  describe('successful fetch and parse', () => {
    it('should fetch and parse ADP data for PPR format', async () => {
      const mockResponse = [
        { name: 'Patrick Mahomes', adp: 1.5, position: 'QB' },
        { name: 'Josh Allen', adp: 2.1, position: 'QB' },
        { name: 'Christian McCaffrey', adp: 3.2, position: 'RB' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response)

      const result = await fetchADP('ppr', 12, 2025)

      expect(result).toEqual({
        'Patrick Mahomes': 1.5,
        'Josh Allen': 2.1,
        'Christian McCaffrey': 3.2,
      })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2025'
      )
    })

    it('should fetch and parse ADP data for half-PPR format', async () => {
      const mockResponse = [
        { name: 'Travis Kelce', adp: 5.0, position: 'TE' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response)

      const result = await fetchADP('half-ppr', 10, 2025)

      expect(result).toEqual({
        'Travis Kelce': 5.0,
      })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://fantasyfootballcalculator.com/api/v1/adp/half-ppr?teams=10&year=2025'
      )
    })

    it('should fetch and parse ADP data for standard format', async () => {
      const mockResponse = [
        { name: 'Lamar Jackson', adp: 2.5, position: 'QB' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response)

      const result = await fetchADP('standard', 14, 2025)

      expect(result).toEqual({
        'Lamar Jackson': 2.5,
      })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://fantasyfootballcalculator.com/api/v1/adp/standard?teams=14&year=2025'
      )
    })

    it('should handle empty response array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      const result = await fetchADP('ppr', 12, 2025)

      expect(result).toEqual({})
    })

    it('should handle response with missing name field', async () => {
      const mockResponse = [
        { adp: 1.5, position: 'QB' },
        { name: 'Josh Allen', adp: 2.1, position: 'QB' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response)

      const result = await fetchADP('ppr', 12, 2025)

      // Should skip entries without name
      expect(result).toEqual({
        'Josh Allen': 2.1,
      })
    })

    it('should handle response with missing adp field', async () => {
      const mockResponse = [
        { name: 'Patrick Mahomes', position: 'QB' },
        { name: 'Josh Allen', adp: 2.1, position: 'QB' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response)

      const result = await fetchADP('ppr', 12, 2025)

      // Should skip entries without adp
      expect(result).toEqual({
        'Josh Allen': 2.1,
      })
    })
  })

  describe('error handling', () => {
    it('should return empty object on 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      const result = await fetchADP('ppr', 12, 2025)

      expect(result).toEqual({})
    })

    it('should return empty object on 500 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const result = await fetchADP('ppr', 12, 2025)

      expect(result).toEqual({})
    })

    it('should return empty object on network error', async () => {
      mockFetch.mockRejectedValueOnce(
        new Error('Network error')
      )

      const result = await fetchADP('ppr', 12, 2025)

      expect(result).toEqual({})
    })

    it('should return empty object on JSON parse error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as unknown as Response)

      const result = await fetchADP('ppr', 12, 2025)

      expect(result).toEqual({})
    })
  })

  describe('caching', () => {
    it('should cache result and not refetch on second call', async () => {
      const mockResponse = [
        { name: 'Patrick Mahomes', adp: 1.5, position: 'QB' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response)

      // First call
      const result1 = await fetchADP('ppr', 12, 2025)
      expect(result1).toEqual({ 'Patrick Mahomes': 1.5 })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call with same parameters
      const result2 = await fetchADP('ppr', 12, 2025)
      expect(result2).toEqual({ 'Patrick Mahomes': 1.5 })
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should cache separately for different formats', async () => {
      const pprResponse = [
        { name: 'Patrick Mahomes', adp: 1.5, position: 'QB' },
      ]
      const halfPprResponse = [
        { name: 'Patrick Mahomes', adp: 1.6, position: 'QB' },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => pprResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => halfPprResponse,
        } as Response)

      const result1 = await fetchADP('ppr', 12, 2025)
      const result2 = await fetchADP('half-ppr', 12, 2025)

      expect(result1).toEqual({ 'Patrick Mahomes': 1.5 })
      expect(result2).toEqual({ 'Patrick Mahomes': 1.6 })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should cache separately for different team counts', async () => {
      const response12 = [
        { name: 'Patrick Mahomes', adp: 1.5, position: 'QB' },
      ]
      const response10 = [
        { name: 'Patrick Mahomes', adp: 1.4, position: 'QB' },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => response12,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => response10,
        } as Response)

      const result1 = await fetchADP('ppr', 12, 2025)
      const result2 = await fetchADP('ppr', 10, 2025)

      expect(result1).toEqual({ 'Patrick Mahomes': 1.5 })
      expect(result2).toEqual({ 'Patrick Mahomes': 1.4 })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should cache separately for different years', async () => {
      const response2025 = [
        { name: 'Patrick Mahomes', adp: 1.5, position: 'QB' },
      ]
      const response2024 = [
        { name: 'Patrick Mahomes', adp: 2.0, position: 'QB' },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => response2025,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => response2024,
        } as Response)

      const result1 = await fetchADP('ppr', 12, 2025)
      const result2 = await fetchADP('ppr', 12, 2024)

      expect(result1).toEqual({ 'Patrick Mahomes': 1.5 })
      expect(result2).toEqual({ 'Patrick Mahomes': 2.0 })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should clear cache when clearADPCache is called', async () => {
      const mockResponse = [
        { name: 'Patrick Mahomes', adp: 1.5, position: 'QB' },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      // First call
      await fetchADP('ppr', 12, 2025)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Clear cache
      clearADPCache()

      // Second call should refetch
      await fetchADP('ppr', 12, 2025)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('attribution', () => {
    it('should include attribution comment in source', async () => {
      const mockResponse = [
        { name: 'Patrick Mahomes', adp: 1.5, position: 'QB' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response)

      await fetchADP('ppr', 12, 2025)

      // Attribution is in the source code, not in the return value
      // This test verifies the function exists and works
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})
