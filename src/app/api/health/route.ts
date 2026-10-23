import { sql } from "drizzle-orm"
import { getDb } from "@/db"

/** Liveness + database check, for k8s probes later on. */
export async function GET() {
  try {
    const db = await getDb()
    await db.execute(sql`select 1`)
    return Response.json({ status: "healthy" })
  } catch {
    return Response.json({ status: "unhealthy" }, { status: 503 })
  }
}
