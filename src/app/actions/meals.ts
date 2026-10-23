"use server"

import { and, eq, gte, lt, sum } from "drizzle-orm"
import { refresh } from "next/cache"
import { z } from "zod"
import { getDb } from "@/db"
import { mealLogs, recipes } from "@/db/schema"
import { AIError, suggestMeal } from "@/lib/ai"
import { requireUser } from "@/lib/auth/dal"
import { dayRange, getTimeZone } from "@/lib/time"
import { firstError, MEAL_TYPES, mealLogInputSchema, type GeneratedRecipe, type MealLogInput } from "@/lib/validation"
import { fail, ok, type ActionResult } from "./result"

async function ownRecipe(userId: number, recipeId: number | null | undefined) {
  if (!recipeId) return null
  const db = await getDb()
  const [recipe] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
  return recipe?.id ?? null
}

function toRow(input: z.output<typeof mealLogInputSchema>) {
  return {
    title: input.title,
    foods: input.foods,
    ...input.nutrition,
    eatenAt: new Date(input.eatenAt),
    notes: input.notes,
    favorite: input.favorite,
  }
}

export async function createMealLog(input: MealLogInput): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = mealLogInputSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const db = await getDb()
  await db.insert(mealLogs).values({
    ...toRow(parsed.data),
    userId: user.id,
    sourceRecipeId: await ownRecipe(user.id, parsed.data.sourceRecipeId),
  })
  refresh()
  return ok(undefined, "Meal logged")
}

export async function updateMealLog(id: number, input: MealLogInput): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = mealLogInputSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))
  const db = await getDb()
  const updated = await db
    .update(mealLogs)
    .set({ ...toRow(parsed.data), sourceRecipeId: await ownRecipe(user.id, parsed.data.sourceRecipeId) })
    .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, user.id)))
    .returning({ id: mealLogs.id })
  if (!updated.length) return fail("Meal not found")
  refresh()
  return ok(undefined, "Meal updated")
}

export async function setMealFavorite(id: number, favorite: boolean): Promise<ActionResult> {
  const user = await requireUser()
  const db = await getDb()
  const updated = await db
    .update(mealLogs)
    .set({ favorite })
    .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, user.id)))
    .returning({ id: mealLogs.id })
  if (!updated.length) return fail("Meal not found")
  refresh()
  return ok(undefined)
}

export async function deleteMealLog(id: number): Promise<ActionResult> {
  const user = await requireUser()
  const db = await getDb()
  const deleted = await db
    .delete(mealLogs)
    .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, user.id)))
    .returning({ id: mealLogs.id })
  if (!deleted.length) return fail("Meal not found")
  refresh()
  return ok(undefined, "Meal deleted")
}

const suggestSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  availableMinutes: z.number().int().min(10).max(180),
  attempt: z.number().int().min(0).max(1000).default(0),
})

/** "Pick a meal for me": remaining targets are worked out here, not trusted from the browser. */
export async function suggestMealAction(input: z.input<typeof suggestSchema>): Promise<ActionResult<GeneratedRecipe>> {
  const user = await requireUser()
  const parsed = suggestSchema.safeParse(input)
  if (!parsed.success) return fail(firstError(parsed.error))

  const db = await getDb()
  const { start, end } = dayRange(await getTimeZone())
  const [eaten] = await db
    .select({ calories: sum(mealLogs.calories).mapWith(Number), protein: sum(mealLogs.protein).mapWith(Number) })
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, user.id), gte(mealLogs.eatenAt, start), lt(mealLogs.eatenAt, end)))
  const { dailyCalorieTarget, dailyProteinTarget } = user.preferences

  try {
    const recipe = await suggestMeal(
      user,
      {
        mealType: parsed.data.mealType,
        availableMinutes: parsed.data.availableMinutes,
        remainingCalories: dailyCalorieTarget ? Math.max(dailyCalorieTarget - (eaten?.calories ?? 0), 0) : undefined,
        remainingProtein: dailyProteinTarget ? Math.max(dailyProteinTarget - (eaten?.protein ?? 0), 0) : undefined,
      },
      parsed.data.attempt
    )
    return ok(recipe)
  } catch (error) {
    return fail(error instanceof AIError ? error.message : "A meal couldn't be suggested. Please try again.")
  }
}
