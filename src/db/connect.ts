import { mkdirSync } from "node:fs"
import path from "node:path"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "./schema"

export type Database = NodePgDatabase<typeof schema>

/**
 * DATABASE_URL picks the driver:
 *  - postgres://…            → a real Postgres server (node-postgres pool)
 *  - pglite:./path, or unset → embedded Postgres (PGlite) stored on disk, nothing to install
 * Pending migrations from ./drizzle are applied before the connection is returned.
 */
export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "pglite:./.data/pglite"
}

export async function openDatabase(url = databaseUrl()): Promise<{ db: Database; close: () => Promise<void> }> {
  // turbopackIgnore: runtime paths, not files to bundle (copy ./drizzle next to the server when deploying).
  const migrationsFolder = path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle")

  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite")
    const { drizzle } = await import("drizzle-orm/pglite")
    const { migrate } = await import("drizzle-orm/pglite/migrator")
    const dataDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), url.slice("pglite:".length))
    mkdirSync(dataDir, { recursive: true })
    const client = new PGlite(dataDir)
    const db = drizzle(client, { schema })
    await migrate(db, { migrationsFolder })
    // Both drivers expose the same query builder, so the rest of the app only sees one type.
    return { db: db as unknown as Database, close: () => client.close() }
  }

  const { Pool } = await import("pg")
  const { drizzle } = await import("drizzle-orm/node-postgres")
  const { migrate } = await import("drizzle-orm/node-postgres/migrator")
  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool, { schema })
  await migrate(db, { migrationsFolder })
  return { db, close: () => pool.end() }
}
