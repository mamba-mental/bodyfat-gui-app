export interface CloudSyncStatus {
  phase: 'provider_required' | 'configuration_incomplete' | 'ready_for_migration'
  database_configured: boolean
  authentication_configured: boolean
  sync_enabled: boolean
  local_store: 'sqlite'
  required_actions: string[]
}

/**
 * Reports configuration readiness without returning hostnames, connection
 * strings, credentials, or other reusable secret material.
 */
export function getCloudSyncStatus(): CloudSyncStatus {
  const databaseConfigured = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL)
  const authenticationConfigured = Boolean(process.env.AUTH_SECRET || process.env.AUTH_PROVIDER)
  const syncEnabled = process.env.CLOUD_SYNC_ENABLED === 'true'
  const requiredActions: string[] = []
  if (!databaseConfigured) requiredActions.push('Choose and configure a managed Postgres provider.')
  if (!authenticationConfigured) requiredActions.push('Choose and configure an authentication provider.')
  if (!syncEnabled) requiredActions.push('Run migration validation before enabling cloud writes.')

  return {
    phase: databaseConfigured && authenticationConfigured && syncEnabled
      ? 'ready_for_migration'
      : databaseConfigured || authenticationConfigured
        ? 'configuration_incomplete'
        : 'provider_required',
    database_configured: databaseConfigured,
    authentication_configured: authenticationConfigured,
    sync_enabled: syncEnabled,
    local_store: 'sqlite',
    required_actions: requiredActions,
  }
}
