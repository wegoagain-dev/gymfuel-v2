import "server-only"

import { users } from "./schema"
import { openDatabase, type Database } from "./connect"
import { seedDemoData } from "./seed"

export type { Database }

/**
 * One shared connection per server process (kept on globalThis so dev hot reloads reuse it).
 * In development a brand-new, empty database is filled with demo data on first use.
 */
export async function getDb(): Promise<Database> {
  const g = globalThis as unknown as { __gymfuelDb?: Promise<Database> }
  g.__gymfuelDb ??= connect().catch((error) => {
    g.__gymfuelDb = undefined
    throw error
  })
  return g.__gymfuelDb
}

async function connect() {
  const { db } = await openDatabase()
  const autoSeed = process.env.NODE_ENV !== "production" && process.env.SEED_DEMO_DATA !== "false"
  if (autoSeed) {
    const [existing] = await db.select({ id: users.id }).from(users).limit(1)
    if (!existing) await seedDemoData(db)
  }
  return db
}
