import "server-only"

import { cache } from "react"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { getDb } from "@/db"
import { users, type User } from "@/db/schema"
import { readSession } from "./session"

/**
 * Data Access Layer: every page, action and route handler gets the user from here, so the
 * session check can't be forgotten. `cache` dedupes it within one request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSession()
  if (!session) return null
  const db = await getDb()
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  return user ?? null
})

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  // A cookie without a valid user (expired, or the DB was reset): clear it, then log in.
  if (!user) redirect("/api/auth/clear")
  return user
}

export async function requireCoach(): Promise<User> {
  const user = await requireUser()
  if (user.role !== "coach") redirect("/today")
  return user
}

/** The subset of the user that is safe to hand to Client Components. */
export type PublicUser = Pick<User, "id" | "email" | "username" | "fullName" | "role" | "clientCode" | "dietaryRestrictions" | "preferences">

export function toPublicUser(user: User): PublicUser {
  const { id, email, username, fullName, role, clientCode, dietaryRestrictions, preferences } = user
  return { id, email, username, fullName, role, clientCode, dietaryRestrictions, preferences }
}
