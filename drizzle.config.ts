import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

/**
 * This database is SHARED with LifeOS (`public`) and the cookbook (`cookbook`).
 *
 *  - `schemaFilter: ['bakery']` — drizzle-kit only looks at our schema.
 *  - `migrations` — our journal lives in `bakery.__drizzle_migrations`, not the
 *    default `drizzle.__drizzle_migrations` LifeOS uses. A shared journal makes
 *    the migrator skip migrations older than the newest row it finds.
 *
 * drizzle-kit creates the `bakery` schema for the journal before running any
 * migration, so the generated `CREATE SCHEMA` in 0000 must be
 * `CREATE SCHEMA IF NOT EXISTS` (hit in the cookbook repo).
 */
export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['bakery'],
  migrations: {
    schema: 'bakery',
    table: '__drizzle_migrations',
  },
  dbCredentials: {
    url: process.env.DIRECT_URL ?? '',
  },
  strict: true,
  verbose: true,
})
