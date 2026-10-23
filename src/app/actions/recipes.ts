"use server"

import { and, eq } from "drizzle-orm"
import { refresh } from "next/cache"
import { redirect } from "next/navigation"
import { getDb } from "@/db"
import { recipes, type RecipeIngredient } from "@/db/schema"
import { findRecipeImage } from "@/lib/ai"
import { requireUser } from "@/lib/auth/dal"
import { commaList, fieldErrors, firstError, generatedRecipeSchema, recipeInputSchema, type GeneratedRecipe } from "@/lib/validation"
import { fail, ok, type ActionResult } from "./result"

export type RecipeFormState = ActionResult<{ id: number }> | null

/** "200g chicken breast" / "1 cup rice" / "Salt" → structured ingredient. */
function parseIngredientLine(line: string): RecipeIngredient | null {
  const text = line.trim().replace(/^[-•*]\s*/, "")
  if (!text) return null
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]{1,5}\b)?\s+(.+)$/)
  if (!match) return { name: text.slice(0, 120), quantity: null, unit: null }
  return { quantity: Number(match[1].replace(",", ".")), unit: match[2] ?? null, name: match[3].slice(0, 120) }
}

export async function saveRecipe(recipeId: number | null, _prev: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  const user = await requireUser()
  const parsed = recipeInputSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error))
  const { ingredientsText, tagsText, ...data } = parsed.data
  const values = {
    ...data,
    ingredients: ingredientsText.split("\n").map(parseIngredientLine).filter((item): item is RecipeIngredient => Boolean(item)).slice(0, 40),
    tags: commaList(tagsText, 12),
  }

  const db = await getDb()
  let id = recipeId
  if (recipeId) {
    const updated = await db
      .update(recipes)
      .set(values)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .returning({ id: recipes.id })
    if (!updated.length) return fail("Recipe not found")
  } else {
    const [created] = await db
      .insert(recipes)
      .values({ ...values, userId: user.id, imageUrl: await findRecipeImage(values.title) })
      .returning({ id: recipes.id })
    id = created.id
  }
  redirect(`/recipes/${id}`)
}

export async function deleteRecipe(id: number): Promise<ActionResult> {
  const user = await requireUser()
  const db = await getDb()
  // meal_logs.source_recipe_id is ON DELETE SET NULL, so history keeps its entries.
  const deleted = await db
    .delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, user.id)))
    .returning({ id: recipes.id })
  if (!deleted.length) return fail("Recipe not found")
  refresh()
  return ok(undefined, "Recipe deleted")
}

/** Saves an AI-generated recipe (from Groceries or "Pick a meal for me") to Recipes. */
export async function saveGeneratedRecipe(recipe: GeneratedRecipe): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser()
  const parsed = generatedRecipeSchema.safeParse(recipe)
  if (!parsed.success) return fail("That recipe couldn't be saved")
  const r = parsed.data
  const db = await getDb()
  const [created] = await db
    .insert(recipes)
    .values({
      userId: user.id,
      title: r.title.slice(0, 200),
      description: r.description.slice(0, 1000),
      instructions: r.instructions.slice(0, 10_000),
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      servings: r.servings,
      difficulty: r.difficulty,
      tags: r.tags.slice(0, 12),
      ingredients: r.ingredients.slice(0, 40).map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      ...r.nutrition,
      imageUrl: await findRecipeImage(r.title),
    })
    .returning({ id: recipes.id })
  refresh()
  return ok({ id: created.id }, "Saved to Recipes")
}
