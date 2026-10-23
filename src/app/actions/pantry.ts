"use server"

import { and, asc, eq } from "drizzle-orm"
import { refresh } from "next/cache"
import { z } from "zod"
import { getDb } from "@/db"
import { pantryIngredients } from "@/db/schema"
import { AIError, generatePantryRecipes } from "@/lib/ai"
import { requireUser } from "@/lib/auth/dal"
import { GOALS, MEAL_TYPES, normalizeName, type GeneratedRecipe } from "@/lib/validation"
import { fail, ok, type ActionResult } from "./result"

export async function addPantryIngredient(rawName: string): Promise<ActionResult> {
  const user = await requireUser()
  const name = rawName.split(/\s+/).filter(Boolean).join(" ").slice(0, 120)
  if (!name) return fail("Type an ingredient first")
  const db = await getDb()
  const added = await db
    .insert(pantryIngredients)
    .values({ userId: user.id, name, normalizedName: normalizeName(name) })
    .onConflictDoNothing()
    .returning({ id: pantryIngredients.id })
  if (!added.length) return fail(`${name} is already in your kitchen`)
  refresh()
  return ok(undefined)
}

export async function removePantryIngredient(id: number): Promise<ActionResult> {
  const user = await requireUser()
  const db = await getDb()
  await db.delete(pantryIngredients).where(and(eq(pantryIngredients.id, id), eq(pantryIngredients.userId, user.id)))
  refresh()
  return ok(undefined)
}

const generateSchema = z.object({ goal: z.enum(GOALS), mealType: z.enum(MEAL_TYPES) })

export async function generateFromPantry(input: z.input<typeof generateSchema>): Promise<ActionResult<GeneratedRecipe[]>> {
  const user = await requireUser()
  const parsed = generateSchema.safeParse(input)
  if (!parsed.success) return fail("Pick a goal and meal type")
  const db = await getDb()
  const pantry = await db
    .select({ name: pantryIngredients.name })
    .from(pantryIngredients)
    .where(eq(pantryIngredients.userId, user.id))
    .orderBy(asc(pantryIngredients.name))
  try {
    return ok(await generatePantryRecipes(user, pantry.map((item) => item.name), parsed.data.goal, parsed.data.mealType))
  } catch (error) {
    return fail(error instanceof AIError ? error.message : "Recipes couldn't be generated. Please try again.")
  }
}
