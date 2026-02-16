/**
 * Projection type definitions for player projections
 */

export type ProjectionSource = 'manual_csv' | 'fantasypros' | 'nflverse';

export interface PlayerProjection {
  playerId: string;
  fullName: string;
  position: string;
  projectedPoints: number;
  source: ProjectionSource;
  updatedAt: string; // ISO timestamp
}
