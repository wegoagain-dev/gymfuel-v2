import "server-only"

import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"
import type { FitnessGoal, MealType, User } from "@/db/schema"
import {
  generatedRecipeSchema,
  mealAnalysisSchema,
  normalizeName,
  type GeneratedRecipe,
  type MealAnalysis,
} from "@/lib/validation"
import { demoAnalyzeMeal, demoRecipes } from "./demo"

export class AIError extends Error {}

/** "openai" when a key is configured, otherwise the offline demo generator. */
export function aiMode(): "openai" | "demo" {
  return process.env.OPENAI_API_KEY ? "openai" : "demo"
}

function client() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 35_000, maxRetries: 1 })
}

const ANALYSIS_MODEL = () => process.env.OPENAI_MEAL_ANALYSIS_MODEL || "gpt-5.6-terra"
const RECIPE_MODEL = () => process.env.OPENAI_RECIPE_MODEL || "gpt-5.6-luna"

async function parse<T extends z.ZodType>(
  schema: T,
  name: string,
  model: string,
  system: string,
  content: OpenAI.Responses.ResponseInputMessageContentList | string
): Promise<z.infer<T>> {
  try {
    const response = await client().responses.parse({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content },
      ],
      text: { format: zodTextFormat(schema, name) },
      store: false,
    })
    if (!response.output_parsed) throw new AIError("The AI response couldn't be read. Please try again.")
    return response.output_parsed as z.infer<T>
  } catch (error) {
    if (error instanceof AIError) throw error
    if (error instanceof OpenAI.APIConnectionTimeoutError) throw new AIError("The AI took too long to answer. Please retry.")
    throw new AIError("The AI service is temporarily unavailable. Please try again shortly.")
  }
}

function profileContext(user: User) {
  const prefs = user.preferences
  return {
    goal: prefs.fitnessGoal ?? "maintain",
    restrictions: user.dietaryRestrictions,
    cuisines: prefs.preferredCuisines ?? [],
    disliked: prefs.dislikedIngredients ?? [],
    maxMinutes: prefs.maxPrepTimeMinutes,
  }
}

/** Photo → editable draft. The image is only held in memory for this call. */
export async function analyzeMealPhoto(jpeg: Buffer, portionContext: string | null): Promise<MealAnalysis> {
  if (aiMode() === "demo") return demoAnalyzeMeal(portionContext)
  const draft = await parse(
    mealAnalysisSchema,
    "meal_analysis",
    ANALYSIS_MODEL(),
    "You are a cautious food-photo assistant. Return only the requested structured draft. Do not provide medical advice or invent certainty.",
    [
      {
        type: "input_text",
        text:
          "Analyse this single meal photo for a gym nutrition journal. Draft a concise meal title, the visible food components and likely portions, and estimated total calories, protein, carbohydrates and fat for the entire pictured serving. Never claim exact accuracy. Put uncertainty, hidden ingredients, sauces, oils and portion assumptions in assumptions. " +
          `User context: ${portionContext?.trim() || "none supplied"}`,
      },
      { type: "input_image", image_url: `data:image/jpeg;base64,${jpeg.toString("base64")}`, detail: "high" },
    ]
  )
  return { ...draft, foods: draft.foods.slice(0, 30), assumptions: draft.assumptions.slice(0, 10) }
}

/** One decisive meal idea for "Pick a meal for me". */
export async function suggestMeal(
  user: User,
  input: { mealType: MealType; availableMinutes: number; remainingCalories?: number; remainingProtein?: number },
  attempt = 0
): Promise<GeneratedRecipe> {
  const profile = profileContext(user)
  const totalTime = Math.min(input.availableMinutes, profile.maxMinutes ?? input.availableMinutes)
  if (aiMode() === "demo") {
    const [recipe] = demoRecipes(
      { pantry: [], mealType: input.mealType, goal: profile.goal, dietaryRestrictions: profile.restrictions, disliked: profile.disliked, cuisines: profile.cuisines, maxMinutes: totalTime },
      1,
      attempt
    )
    return { ...recipe, missingIngredients: [], ingredients: recipe.ingredients.map((item) => ({ ...item, availableInPantry: false })) }
  }
  const remaining =
    input.remainingCalories == null && input.remainingProtein == null
      ? "No remaining daily target context is available."
      : `Remaining against the user's own daily targets is about ${input.remainingCalories ?? "unknown"} kcal and ${input.remainingProtein ?? "unknown"} g protein. Use this only as context; the meal doesn't need to use it all.`
  return parse(
    generatedRecipeSchema,
    "meal_suggestion",
    RECIPE_MODEL(),
    "You are a decisive fitness-focused meal assistant. Give one useful answer, respect user preferences, avoid medical advice, and return only the structured recipe.",
    `Choose one complete ${input.mealType} for a user with a ${profile.goal} goal who has no idea what to make. Keep total prep and cook time within ${totalTime} minutes. Make it practical, high in protein, one serving, concise instructions. Adjust calorie density for the goal. Respect all dietary restrictions and never use disliked ingredients. Use preferred cuisines as inspiration only. Nutrition values are per-serving estimates. This is not a pantry comparison: set availableInPantry to false and missingIngredients to []. ` +
      `Dietary restrictions: ${JSON.stringify(profile.restrictions)}. Preferred cuisines: ${JSON.stringify(profile.cuisines)}. Ingredients to avoid: ${JSON.stringify(profile.disliked)}. ${remaining} (variation #${attempt})`
  )
}

/** Three distinct pantry-first recipes for the chosen goal and meal type. */
export async function generatePantryRecipes(
  user: User,
  pantry: string[],
  goal: FitnessGoal,
  mealType: MealType
): Promise<GeneratedRecipe[]> {
  const profile = profileContext(user)
  let recipes: GeneratedRecipe[]
  if (aiMode() === "demo") {
    recipes = demoRecipes(
      { pantry, goal, mealType, dietaryRestrictions: profile.restrictions, disliked: profile.disliked, cuisines: profile.cuisines, maxMinutes: profile.maxMinutes },
      3
    )
  } else {
    const result = await parse(
      z.object({ recipes: z.array(generatedRecipeSchema) }),
      "pantry_recipes",
      RECIPE_MODEL(),
      "You are a practical fitness-focused recipe generator. Respect every dietary restriction and return only the requested structured recipes.",
      `Create exactly three distinct ${mealType} recipes for a user whose fitness goal is ${goal}. Make every recipe high in protein and adjust calorie density: lighter for cut, balanced for maintain, denser for bulk. Prioritise the supplied pantry. If the pantry is empty, still create practical recipes from the preferences. A recipe may need at most three ingredients not in the pantry; list them in missingIngredients. Never use a disliked ingredient. Treat cuisines as inspiration. Nutrition is per serving.` +
        (profile.maxMinutes ? ` Keep total time within ${profile.maxMinutes} minutes.` : "") +
        ` Pantry: ${JSON.stringify(pantry)}. Dietary restrictions: ${JSON.stringify(profile.restrictions)}. Preferred cuisines: ${JSON.stringify(profile.cuisines)}. Ingredients to avoid: ${JSON.stringify(profile.disliked)}.`
    )
    recipes = result.recipes.slice(0, 3)
    if (recipes.length < 3) throw new AIError("The AI returned too few recipes. Please try again.")
  }
  // Re-check pantry matches ourselves rather than trusting the model (demo mode matches fuzzily).
  const have = new Set(pantry.map(normalizeName))
  const trustFlag = aiMode() === "demo"
  return recipes.map((recipe) => ({
    ...recipe,
    missingIngredients: recipe.missingIngredients.slice(0, 3),
    ingredients: recipe.ingredients.map((item) => ({ ...item, availableInPantry: have.has(normalizeName(item.name)) || (trustFlag && item.availableInPantry) })),
  }))
}

/** Optional: a stock photo for a new recipe (needs UNSPLASH_ACCESS_KEY). */
export async function findRecipeImage(title: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const url = new URL("https://api.unsplash.com/search/photos")
    url.search = new URLSearchParams({ query: `${title} healthy meal`, per_page: "1", orientation: "landscape", content_filter: "high" }).toString()
    const response = await fetch(url, { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(8_000) })
    if (!response.ok) return null
    const data = (await response.json()) as { results?: { urls?: { regular?: string } }[] }
    return data.results?.[0]?.urls?.regular ?? null
  } catch {
    return null
  }
}
