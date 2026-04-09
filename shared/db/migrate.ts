import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './client'
import { log } from '../logging'

export async function runMigrations(): Promise<void> {
  log('info', 'db_migration_start')
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    log('info', 'db_migration_complete')
  } catch (err) {
    log('error', 'db_migration_failed', { error: String(err) })
    throw err
  }
}

// Allow running directly: bun shared/db/migrate.ts
if (import.meta.main) {
  await runMigrations()
  process.exit(0)
}
