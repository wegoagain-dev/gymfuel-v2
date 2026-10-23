import "server-only"

import { and, asc, desc, eq, gte, lt } from "drizzle-orm"
import { getDb } from "@/db"
import { coachClients, groceryItems, mealLogs, pantryIngredients, recipes, users, type User } from "@/db/schema"

/**
 * Read queries used by pages. Each takes the already-authenticated user (from
 * lib/auth/dal.ts), so a page can't accidentally read someone else's rows.
 */

export async function getMealLogsBetween(user: User, start: Date, end: Date) {
  const db = await getDb()
  return db
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, user.id), gte(mealLogs.eatenAt, start), lt(mealLogs.eatenAt, end)))
    .orderBy(asc(mealLogs.eatenAt))
}

export async function getMealHistory(user: User, limit = 200) {
  const db = await getDb()
  return db.select().from(mealLogs).where(eq(mealLogs.userId, user.id)).orderBy(desc(mealLogs.eatenAt)).limit(limit)
}

export async function getRecipes(user: User) {
  const db = await getDb()
  return db.select().from(recipes).where(eq(recipes.userId, user.id)).orderBy(desc(recipes.createdAt))
}

export async function getRecipe(user: User, id: number) {
  if (!Number.isInteger(id)) return null
  const db = await getDb()
  const [recipe] = await db.select().from(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, user.id)))
  return recipe ?? null
}

export async function getPantry(user: User) {
  const db = await getDb()
  return db.select().from(pantryIngredients).where(eq(pantryIngredients.userId, user.id)).orderBy(asc(pantryIngredients.name))
}

export async function getGroceries(user: User) {
  const db = await getDb()
  return db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.userId, user.id))
    .orderBy(asc(groceryItems.checked), asc(groceryItems.expirationDate), asc(groceryItems.name))
}

const clientColumns = { id: users.id, username: users.username, fullName: users.fullName, email: users.email, preferences: users.preferences }

export async function getClients(coach: User) {
  const db = await getDb()
  return db
    .select({ ...clientColumns, linkedAt: coachClients.createdAt })
    .from(coachClients)
    .innerJoin(users, eq(users.id, coachClients.clientId))
    .where(eq(coachClients.coachId, coach.id))
    .orderBy(asc(users.fullName))
}

/** Only returns the client if this coach is linked to them. */
export async function getClientForCoach(coach: User, clientId: number) {
  if (!Number.isInteger(clientId)) return null
  const db = await getDb()
  const [client] = await db
    .select(clientColumns)
    .from(coachClients)
    .innerJoin(users, eq(users.id, coachClients.clientId))
    .where(and(eq(coachClients.coachId, coach.id), eq(coachClients.clientId, clientId)))
  return client ?? null
}

export async function getClientActivity(clientId: number, start: Date) {
  const db = await getDb()
  const [logs, clientRecipes] = await Promise.all([
    db.select().from(mealLogs).where(and(eq(mealLogs.userId, clientId), gte(mealLogs.eatenAt, start))).orderBy(desc(mealLogs.eatenAt)),
    db.select().from(recipes).where(eq(recipes.userId, clientId)).orderBy(desc(recipes.createdAt)),
  ])
  return { logs, recipes: clientRecipes }
}

export async function getMyCoach(user: User) {
  const db = await getDb()
  const [coach] = await db
    .select({ fullName: users.fullName, username: users.username, email: users.email })
    .from(coachClients)
    .innerJoin(users, eq(users.id, coachClients.coachId))
    .where(eq(coachClients.clientId, user.id))
  return coach ?? null
}
