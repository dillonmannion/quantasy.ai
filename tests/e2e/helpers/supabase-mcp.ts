/**
 * Supabase MCP Test Helpers
 *
 * Documented SQL patterns for dynamic test data operations via Supabase MCP.
 * These patterns can be used in MCP context for test data management.
 */

export const MCP_PATTERNS = {
  insertPlayer: (id: string, name: string, position: string) => `
    INSERT INTO players (id, full_name, position, team, projected_points, sleeper_data)
    VALUES ('${id}', '${name}', '${position}', 'KC', 300, '{"player_id": "${id}"}')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name
  `,

  cleanupTestData: () => `
    DELETE FROM players WHERE id LIKE 'e2e-test-%';
    DELETE FROM algorithm_outputs WHERE league_id = '987654321';
  `,

  verifyUserCanAccessLeague: (userId: string, leagueId: string) => `
    SELECT EXISTS (
      SELECT 1 FROM user_leagues
      WHERE user_id = '${userId}' AND league_id = '${leagueId}'
    ) as has_access
  `,

  verifyRlsPolicy: (tableName: string, userId: string) => `
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims = '{"sub": "${userId}"}';
    SELECT count(*) FROM ${tableName};
  `,
}
