"use server"

import { and, eq } from "drizzle-orm"
import { refresh } from "next/cache"
import { z } from "zod"
import { getDb } from "@/db"
import { coachClients, users } from "@/db/schema"
import { requireCoach } from "@/lib/auth/dal"
import { fail, ok, type ActionResult } from "./result"

export type LinkFormState = ActionResult | null

const linkSchema = z.object({
  email: z.email("Enter the client's email").transform((value) => value.trim().toLowerCase()),
  code: z.string().trim().toUpperCase().regex(/^[0-9A-F]{16}$/, "Client codes are 16 characters (0-9, A-F)"),
})

export async function linkClient(_prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const coach = await requireCoach()
  const parsed = linkSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const db = await getDb()
  const [client] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1)
  // One message for "no such user" and "wrong code" so the form can't be used to find accounts.
  if (!client || client.clientCode !== parsed.data.code || client.role !== "client") {
    return fail("No client matches that email and code")
  }
  const [existing] = await db.select().from(coachClients).where(eq(coachClients.clientId, client.id)).limit(1)
  if (existing) {
    return fail(existing.coachId === coach.id ? "You're already coaching this client" : "This client already has a coach")
  }
  await db.insert(coachClients).values({ coachId: coach.id, clientId: client.id })
  refresh()
  return ok(undefined, `Linked ${client.fullName || client.username}`)
}

export async function unlinkClient(clientId: number): Promise<ActionResult> {
  const coach = await requireCoach()
  const db = await getDb()
  const removed = await db
    .delete(coachClients)
    .where(and(eq(coachClients.coachId, coach.id), eq(coachClients.clientId, clientId)))
    .returning({ id: coachClients.id })
  if (!removed.length) return fail("Client link not found")
  refresh()
  return ok(undefined, "Client unlinked")
}
