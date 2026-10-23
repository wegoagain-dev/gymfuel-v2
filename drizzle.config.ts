import { defineConfig } from "drizzle-kit"

// Generates SQL migrations from src/db/schema.ts into ./drizzle.
// `npm run db:generate` after changing the schema; the app applies them on start.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
})
