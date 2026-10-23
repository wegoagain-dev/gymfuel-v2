import type { FitnessGoal, MealType } from "@/db/schema"
import type { GeneratedRecipe, MealAnalysis } from "@/lib/validation"

/**
 * Offline stand-in for the AI features, used when OPENAI_API_KEY isn't set. It can't see
 * photos, but it builds sensible drafts from a small nutrition table so every flow can be
 * tried locally. Every result says it's a demo estimate.
 */

type Food = { kcal: number; p: number; c: number; f: number; kind: "protein" | "carb" | "veg" | "extra"; veggie?: boolean }
// Per 100 g (eggs per egg, whey per scoop).
const FOODS: Record<string, Food> = {
  "chicken breast": { kcal: 165, p: 31, c: 0, f: 3.6, kind: "protein" },
  "chicken thighs": { kcal: 209, p: 26, c: 0, f: 11, kind: "protein" },
  chicken: { kcal: 180, p: 29, c: 0, f: 7, kind: "protein" },
  salmon: { kcal: 208, p: 20, c: 0, f: 13, kind: "protein" },
  "salmon fillet": { kcal: 208, p: 20, c: 0, f: 13, kind: "protein" },
  steak: { kcal: 250, p: 26, c: 0, f: 15, kind: "protein" },
  beef: { kcal: 250, p: 26, c: 0, f: 15, kind: "protein" },
  "beef mince": { kcal: 220, p: 22, c: 0, f: 14, kind: "protein" },
  turkey: { kcal: 135, p: 29, c: 0, f: 2, kind: "protein" },
  tuna: { kcal: 132, p: 28, c: 0, f: 1, kind: "protein" },
  prawns: { kcal: 99, p: 24, c: 0, f: 0.3, kind: "protein" },
  tofu: { kcal: 144, p: 17, c: 3, f: 9, kind: "protein", veggie: true },
  eggs: { kcal: 72, p: 6.3, c: 0.4, f: 5, kind: "protein", veggie: true },
  egg: { kcal: 72, p: 6.3, c: 0.4, f: 5, kind: "protein", veggie: true },
  "greek yoghurt": { kcal: 73, p: 10, c: 4, f: 2, kind: "protein", veggie: true },
  "greek yogurt": { kcal: 73, p: 10, c: 4, f: 2, kind: "protein", veggie: true },
  "cottage cheese": { kcal: 98, p: 11, c: 3.4, f: 4.3, kind: "protein", veggie: true },
  lentils: { kcal: 116, p: 9, c: 20, f: 0.4, kind: "protein", veggie: true },
  "whey protein": { kcal: 120, p: 24, c: 3, f: 1.5, kind: "extra", veggie: true },
  rice: { kcal: 130, p: 2.7, c: 28, f: 0.3, kind: "carb", veggie: true },
  "jasmine rice": { kcal: 130, p: 2.7, c: 28, f: 0.3, kind: "carb", veggie: true },
  quinoa: { kcal: 120, p: 4.4, c: 21, f: 1.9, kind: "carb", veggie: true },
  pasta: { kcal: 158, p: 6, c: 31, f: 1, kind: "carb", veggie: true },
  "rolled oats": { kcal: 389, p: 17, c: 66, f: 7, kind: "carb", veggie: true },
  oats: { kcal: 389, p: 17, c: 66, f: 7, kind: "carb", veggie: true },
  "sweet potato": { kcal: 86, p: 1.6, c: 20, f: 0.1, kind: "carb", veggie: true },
  potato: { kcal: 77, p: 2, c: 17, f: 0.1, kind: "carb", veggie: true },
  sourdough: { kcal: 260, p: 9, c: 50, f: 3, kind: "carb", veggie: true },
  bread: { kcal: 260, p: 9, c: 50, f: 3, kind: "carb", veggie: true },
  wraps: { kcal: 300, p: 8, c: 50, f: 7, kind: "carb", veggie: true },
  spinach: { kcal: 23, p: 2.9, c: 3.6, f: 0.4, kind: "veg", veggie: true },
  broccoli: { kcal: 34, p: 2.8, c: 7, f: 0.4, kind: "veg", veggie: true },
  peppers: { kcal: 31, p: 1, c: 6, f: 0.3, kind: "veg", veggie: true },
  "green beans": { kcal: 31, p: 1.8, c: 7, f: 0.1, kind: "veg", veggie: true },
  avocado: { kcal: 160, p: 2, c: 9, f: 15, kind: "extra", veggie: true },
  banana: { kcal: 89, p: 1.1, c: 23, f: 0.3, kind: "extra", veggie: true },
  blueberries: { kcal: 57, p: 0.7, c: 14, f: 0.3, kind: "extra", veggie: true },
  berries: { kcal: 57, p: 0.7, c: 14, f: 0.3, kind: "extra", veggie: true },
  milk: { kcal: 50, p: 3.4, c: 5, f: 2, kind: "extra", veggie: true },
  cheese: { kcal: 400, p: 25, c: 1, f: 33, kind: "extra", veggie: true },
  "olive oil": { kcal: 884, p: 0, c: 0, f: 100, kind: "extra", veggie: true },
  "peanut butter": { kcal: 588, p: 25, c: 20, f: 50, kind: "extra", veggie: true },
}
const PER_UNIT = new Set(["eggs", "egg", "whey protein"])

const titleCase = (value: string) => value.replace(/\b\w/g, (char) => char.toUpperCase())
const sentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const round = (value: number) => Math.round(value)

function lookup(name: string): [string, Food] | undefined {
  const key = name.toLowerCase().trim()
  if (FOODS[key]) return [key, FOODS[key]]
  const match = Object.keys(FOODS)
    .sort((a, b) => b.length - a.length)
    .find((food) => key.includes(food))
  return match ? [match, FOODS[match]] : undefined
}

function totals(parts: { food: Food; amount: number }[]) {
  const sum = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  for (const { food, amount } of parts) {
    const factor = amount / 100
    sum.calories += food.kcal * factor
    sum.protein += food.p * factor
    sum.carbs += food.c * factor
    sum.fat += food.f * factor
  }
  return { calories: round(sum.calories), protein: round(sum.protein), carbs: round(sum.carbs), fat: round(sum.fat) }
}

/** "250g chicken, 150 g rice, 2 eggs" → a draft built from the nutrition table. */
export function demoAnalyzeMeal(portionContext?: string | null): MealAnalysis {
  const parts: { name: string; portion: string; food: Food; amount: number }[] = []
  for (const chunk of (portionContext ?? "").split(/,|\band\b|\+/)) {
    const found = lookup(chunk)
    if (!found) continue
    const [name, food] = found
    const grams = chunk.match(/(\d+(?:\.\d+)?)\s*(g|grams?|ml)\b/i)
    const count = chunk.match(/(\d+(?:\.\d+)?)/)
    const amount = PER_UNIT.has(name) ? (count ? Number(count[1]) : 1) * 100 : grams ? Number(grams[1]) : 150
    const portion = PER_UNIT.has(name) ? `${amount / 100} ${name.includes("whey") ? "scoop" : ""}`.trim() : `${amount} g`
    parts.push({ name: titleCase(name), portion, food, amount })
  }

  if (!parts.length) {
    const fallback: [string, number][] = [["chicken breast", 180], ["rice", 200], ["broccoli", 80]]
    for (const [name, amount] of fallback) parts.push({ name: titleCase(name), portion: `${amount} g`, food: FOODS[name], amount })
  }

  const main = parts.find((part) => part.food.kind === "protein") ?? parts[0]
  const side = parts.find((part) => part.food.kind === "carb")
  return {
    title: side ? `${main.name} with ${side.name.toLowerCase()}` : `${main.name} plate`,
    foods: parts.map(({ name, portion }) => ({ name, portion })),
    nutrition: totals(parts),
    assumptions: [
      "Demo mode: no OPENAI_API_KEY is set, so the photo wasn't analysed.",
      portionContext?.trim()
        ? "Estimated from the portion notes you typed, using standard nutrition values."
        : "No portion notes given, so this is a generic chicken-and-rice placeholder. Edit it before saving.",
      "Cooking oils and sauces aren't included.",
    ],
  }
}

type RecipeOptions = {
  pantry: string[]
  goal: FitnessGoal
  mealType: MealType
  dietaryRestrictions: string[]
  disliked: string[]
  cuisines: string[]
  maxMinutes?: number
}

// Fixed portions for carbs that aren't eaten by the plateful.
const CARB_PORTION: Record<string, number> = { "rolled oats": 70, oats: 70, sourdough: 100, bread: 100, banana: 120, wraps: 70 }

const PORTIONS: Record<FitnessGoal, { protein: number; carb: number; veg: number }> = {
  cut: { protein: 170, carb: 110, veg: 120 },
  maintain: { protein: 190, carb: 170, veg: 100 },
  bulk: { protein: 230, carb: 260, veg: 90 },
}

export function demoRecipes(options: RecipeOptions, count: number, seed = 0): GeneratedRecipe[] {
  const veggie = options.dietaryRestrictions.some((item) => /vegetarian|vegan/i.test(item))
  const avoid = options.disliked.map((item) => item.toLowerCase())
  const allowed = (name: string) => {
    const food = FOODS[name]
    return food && (!veggie || food.veggie) && !avoid.some((bad) => name.includes(bad) || bad.includes(name))
  }
  const pantryKeys = options.pantry.map((item) => lookup(item)?.[0]).filter((key): key is string => Boolean(key))
  const inPantry = (name: string) => pantryKeys.includes(name)
  const breakfast = options.mealType === "breakfast"
  // Which foods make sense for this kind of meal (no oats for dinner, no yoghurt stir-fries).
  const SUITS: Record<"breakfast" | "main", Record<"protein" | "carb", string[]>> = {
    breakfast: { protein: ["eggs", "egg", "greek yoghurt", "greek yogurt", "cottage cheese"], carb: ["rolled oats", "oats", "sourdough", "bread", "banana"] },
    main: {
      protein: ["chicken breast", "chicken thighs", "chicken", "salmon", "salmon fillet", "steak", "beef", "beef mince", "turkey", "tuna", "prawns", "tofu", "lentils", "eggs", "egg"],
      carb: ["rice", "jasmine rice", "quinoa", "pasta", "sweet potato", "potato", "wraps"],
    },
  }
  const suits = SUITS[breakfast ? "breakfast" : "main"]
  const pick = (kind: Food["kind"], defaults: string[], offset: number) => {
    const fits = (key: string) => FOODS[key].kind === kind && allowed(key) && (kind === "veg" || (suits[kind as "protein" | "carb"] ?? []).includes(key))
    const fromPantry = pantryKeys.filter(fits)
    // Use what's in the kitchen first; only suggest buying something when nothing fits.
    const pool = fromPantry.length ? fromPantry : defaults.filter(allowed)
    return pool.length ? pool[(offset + seed) % pool.length] : undefined
  }

  const proteins = breakfast ? ["eggs", "greek yoghurt", "cottage cheese"] : veggie ? ["tofu", "lentils", "eggs"] : ["chicken breast", "salmon", "turkey", "tofu"]
  const carbs = breakfast ? ["rolled oats", "sourdough", "banana"] : ["rice", "sweet potato", "quinoa", "pasta"]
  const vegs = ["spinach", "broccoli", "peppers", "green beans"]
  const portions = PORTIONS[options.goal]
  const scale = options.mealType === "snack" ? 0.5 : 1
  const styles = breakfast
    ? ["power bowl", "breakfast plate", "protein stack"]
    : [options.cuisines[0] ? `${options.cuisines[0]}-style bowl` : "power bowl", "sheet-pan tray", "quick stir-fry"]

  const recipes: GeneratedRecipe[] = []
  for (let index = 0; index < count; index++) {
    const protein = pick("protein", proteins, index) ?? "eggs"
    const carb = pick("carb", carbs, index + 1)
    const veg = pick("veg", vegs, index + 2)
    const parts = [
      { name: protein, amount: PER_UNIT.has(protein) ? (options.goal === "cut" ? 300 : 400) * scale : portions.protein * scale },
      ...(carb ? [{ name: carb, amount: (CARB_PORTION[carb] ?? portions.carb) * scale }] : []),
      ...(veg ? [{ name: veg, amount: portions.veg * scale }] : []),
      ...(options.goal === "bulk" ? [{ name: "olive oil", amount: 10 }] : []),
    ]
    const used = parts.map((part) => part.name)
    const missing = used.filter((name) => name !== "olive oil" && !inPantry(name)).slice(0, 3)
    const style = styles[index % styles.length]
    const cookTime = Math.min(options.maxMinutes ?? 60, breakfast ? 10 : 20 + index * 5)
    recipes.push({
      title: `${sentenceCase(protein)}${carb ? ` & ${carb.replace("rolled ", "")}` : ""} ${style}`,
      description: `A ${options.goal === "cut" ? "lighter" : options.goal === "bulk" ? "calorie-dense" : "balanced"} high-protein ${options.mealType} built around ${protein}${missing.length ? "" : " — everything is already in your groceries"}.`,
      instructions: [
        `Prep the ${used.filter((name) => name !== protein).join(", ") || "sides"}.`,
        PER_UNIT.has(protein) || protein.includes("yoghurt") || protein.includes("cheese")
          ? `Prepare the ${protein} and season well.`
          : `Season the ${protein} and cook over a medium-high heat until done.`,
        carb ? `Cook the ${carb} and divide between bowls.` : "Plate up.",
        "Season to taste and serve.",
      ]
        .map((step, i) => `${i + 1}. ${step}`)
        .join("\n"),
      prepTime: 10,
      cookTime,
      servings: 1,
      difficulty: index === 2 ? "medium" : "easy",
      tags: ["high-protein", options.goal, options.mealType, "demo"],
      ingredients: parts.map((part) => ({
        name: titleCase(part.name),
        quantity: PER_UNIT.has(part.name) ? part.amount / 100 : round(part.amount),
        unit: PER_UNIT.has(part.name) ? "" : part.name === "olive oil" ? "ml" : "g",
        availableInPantry: inPantry(part.name),
      })),
      nutrition: totals(parts.map((part) => ({ food: FOODS[part.name], amount: part.amount }))),
      missingIngredients: missing.map(titleCase),
    })
  }
  return recipes
}
