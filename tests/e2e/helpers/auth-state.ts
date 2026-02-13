import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Check if E2E auth state file exists
 * Used to conditionally skip tests that require authentication
 */
export function hasE2EAuthState(): boolean {
  const authStatePath = join(__dirname, '..', '.auth', 'user.json')
  return existsSync(authStatePath)
}
