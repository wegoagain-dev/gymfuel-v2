/**
 * npm run db:migrate  – apply migrations
 * npm run db:seed     – wipe all data and load the demo accounts (stop `npm run dev` first when using PGlite)
 */
import { databaseUrl, openDatabase } from "../src/db/connect"
import { DEMO_PASSWORD, seedDemoData } from "../src/db/seed"

async function main() {
  const command = process.argv[2]
  const url = databaseUrl()
  const { db, close } = await openDatabase(url)
  console.log(`✓ Migrations applied (${url.startsWith("pglite:") ? "PGlite " + url.slice(7) : "Postgres"})`)
  if (command === "seed") {
    const counts = await seedDemoData(db)
    console.log(`✓ Seeded ${counts.users} users, ${counts.recipes} recipes, ${counts.mealLogs} meal logs`)
    console.log(`  Log in as alex@gymfuel.test, coach@gymfuel.test or sam@gymfuel.test — password ${DEMO_PASSWORD}`)
  }
  await close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
