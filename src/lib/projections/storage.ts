'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';
import type { PlayerProjection, ProjectionSource } from './types';

export interface SaveProjectionsResult {
  success: number;
  errors: Array<{ playerId: string; error: string }>;
}

export async function saveProjections(
  projections: PlayerProjection[]
): Promise<SaveProjectionsResult> {
  const writeClient = createServiceClient();
  const errors: Array<{ playerId: string; error: string }> = [];
  let successCount = 0;

  for (const projection of projections) {
    try {
      const insertData = {
        id: projection.playerId,
        full_name: projection.fullName,
        position: projection.position,
        projected_points: projection.projectedPoints,
        projection_source: projection.source,
        projection_updated_at: projection.updatedAt,
      };

      const { error } = await writeClient
        .from('players')
        .upsert(insertData as never, { onConflict: 'id' });

      if (error) {
        errors.push({
          playerId: projection.playerId,
          error: error.message,
        });
      } else {
        successCount++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      errors.push({
        playerId: projection.playerId,
        error: errorMessage,
      });
    }
  }

  return {
    success: successCount,
    errors,
  };
}

export async function getProjections(
  source?: ProjectionSource
): Promise<PlayerProjection[]> {
  const supabase = await createClient();

  let query = supabase
    .from('players')
    .select('id, full_name, position, projected_points, projection_source, projection_updated_at')
    .not('projected_points', 'is', null);

  if (source) {
    query = query.eq('projection_source', source);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching projections:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((row: Record<string, unknown>) => ({
    playerId: row.id as string,
    fullName: row.full_name as string,
    position: row.position as string,
    projectedPoints: row.projected_points as number,
    source: (row.projection_source as string || 'manual_csv') as ProjectionSource,
    updatedAt: (row.projection_updated_at as string) || new Date().toISOString(),
  }));
}
