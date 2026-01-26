import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlayerProjection } from '@/lib/projections/types';
import { saveProjections, getProjections } from '@/lib/projections/storage';

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: vi.fn(() => mockSupabase),
}));

import { createClient } from '@/lib/supabase/server';

describe('Projections Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveProjections', () => {
    it('should save projections successfully', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const projections: PlayerProjection[] = [
        {
          playerId: '4046',
          fullName: 'Patrick Mahomes',
          position: 'QB',
          projectedPoints: 385.5,
          source: 'manual_csv',
          updatedAt: '2025-01-25T00:00:00Z',
        },
      ];

      const result = await saveProjections(projections);

      expect(result.success).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '4046',
          full_name: 'Patrick Mahomes',
          position: 'QB',
          projected_points: 385.5,
          projection_source: 'manual_csv',
          projection_updated_at: '2025-01-25T00:00:00Z',
        }),
        { onConflict: 'id' }
      );
    });

    it('should handle errors gracefully', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const projections: PlayerProjection[] = [
        {
          playerId: '4046',
          fullName: 'Patrick Mahomes',
          position: 'QB',
          projectedPoints: 385.5,
          source: 'manual_csv',
          updatedAt: '2025-01-25T00:00:00Z',
        },
      ];

      const result = await saveProjections(projections);

      expect(result.success).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        playerId: '4046',
        error: 'Database error',
      });
    });

    it('should handle exceptions during save', async () => {
      const mockUpsert = vi.fn().mockRejectedValue(new Error('Network error'));
      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const projections: PlayerProjection[] = [
        {
          playerId: '4046',
          fullName: 'Patrick Mahomes',
          position: 'QB',
          projectedPoints: 385.5,
          source: 'manual_csv',
          updatedAt: '2025-01-25T00:00:00Z',
        },
      ];

      const result = await saveProjections(projections);

      expect(result.success).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Network error');
    });

    it('should save multiple projections and track partial failures', async () => {
      const mockUpsert = vi.fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Duplicate key' } })
        .mockResolvedValueOnce({ error: null });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const projections: PlayerProjection[] = [
        {
          playerId: '4046',
          fullName: 'Patrick Mahomes',
          position: 'QB',
          projectedPoints: 385.5,
          source: 'manual_csv',
          updatedAt: '2025-01-25T00:00:00Z',
        },
        {
          playerId: '4984',
          fullName: 'Christian McCaffrey',
          position: 'RB',
          projectedPoints: 312.0,
          source: 'manual_csv',
          updatedAt: '2025-01-25T00:00:00Z',
        },
        {
          playerId: '5859',
          fullName: 'Travis Kelce',
          position: 'TE',
          projectedPoints: 280.5,
          source: 'manual_csv',
          updatedAt: '2025-01-25T00:00:00Z',
        },
      ];

      const result = await saveProjections(projections);

      expect(result.success).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].playerId).toBe('4984');
    });
  });

  describe('getProjections', () => {
    it('should fetch all projections without filter', async () => {
      const mockData = [
        {
          id: '4046',
          full_name: 'Patrick Mahomes',
          position: 'QB',
          projected_points: 385.5,
          projection_source: 'manual_csv',
          projection_updated_at: '2025-01-25T00:00:00Z',
        },
        {
          id: '4984',
          full_name: 'Christian McCaffrey',
          position: 'RB',
          projected_points: 312.0,
          projection_source: 'fantasypros',
          projection_updated_at: '2025-01-24T00:00:00Z',
        },
      ];

      const mockNotChain = Promise.resolve({ data: mockData, error: null });
      (mockNotChain as any).eq = vi.fn().mockReturnValue(mockNotChain);

      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue(mockNotChain),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getProjections();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        playerId: '4046',
        fullName: 'Patrick Mahomes',
        position: 'QB',
        projectedPoints: 385.5,
        source: 'manual_csv',
        updatedAt: '2025-01-25T00:00:00Z',
      });
    });

    it('should fetch projections filtered by source', async () => {
      const mockData = [
        {
          id: '4046',
          full_name: 'Patrick Mahomes',
          position: 'QB',
          projected_points: 385.5,
          projection_source: 'manual_csv',
          projection_updated_at: '2025-01-25T00:00:00Z',
        },
      ];

      const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockNotChain = {
        eq: mockEq,
      };
      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue(mockNotChain),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getProjections('manual_csv');

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('manual_csv');
      expect(mockEq).toHaveBeenCalledWith('projection_source', 'manual_csv');
    });

    it('should return empty array on error', async () => {
      const mockNotChain = Promise.resolve({ data: null, error: { message: 'Query error' } });
      (mockNotChain as any).eq = vi.fn().mockReturnValue(mockNotChain);

      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue(mockNotChain),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getProjections();

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      const mockNotChain = Promise.resolve({ data: null, error: null });
      (mockNotChain as any).eq = vi.fn().mockReturnValue(mockNotChain);

      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue(mockNotChain),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getProjections();

      expect(result).toEqual([]);
    });

    it('should handle missing projection_source with default', async () => {
      const mockData = [
        {
          id: '4046',
          full_name: 'Patrick Mahomes',
          position: 'QB',
          projected_points: 385.5,
          projection_source: null,
          projection_updated_at: '2025-01-25T00:00:00Z',
        },
      ];

      const mockNotChain = Promise.resolve({ data: mockData, error: null });
      (mockNotChain as any).eq = vi.fn().mockReturnValue(mockNotChain);

      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue(mockNotChain),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getProjections();

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('manual_csv');
    });

    it('should handle missing projection_updated_at with current timestamp', async () => {
      const mockData = [
        {
          id: '4046',
          full_name: 'Patrick Mahomes',
          position: 'QB',
          projected_points: 385.5,
          projection_source: 'manual_csv',
          projection_updated_at: null,
        },
      ];

      const mockNotChain = Promise.resolve({ data: mockData, error: null });
      (mockNotChain as any).eq = vi.fn().mockReturnValue(mockNotChain);

      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue(mockNotChain),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await getProjections();

      expect(result).toHaveLength(1);
      expect(result[0].updatedAt).toBeTruthy();
      expect(typeof result[0].updatedAt).toBe('string');
    });
  });
});
