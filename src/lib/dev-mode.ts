/**
 * Development mode helper for bypassing Supabase auth
 * Only works when NODE_ENV=development and ENABLE_DEV_MODE=true
 */

const IS_DEV = process.env.NODE_ENV === 'development'
const DEV_MODE_ENABLED = IS_DEV && process.env.ENABLE_DEV_MODE === 'true'

export function isDevModeEnabled(): boolean {
  if (DEV_MODE_ENABLED && IS_DEV) {
    console.warn('[DEV MODE] Auth bypass active - DO NOT USE IN PRODUCTION')
  }
  return DEV_MODE_ENABLED
}

export function getDevUser() {
  return {
    id: 'dev-user-123',
    email: 'dev@local.test',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
