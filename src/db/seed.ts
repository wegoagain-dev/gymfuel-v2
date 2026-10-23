import bcrypt from "bcryptjs"
import { TZDate } from "@date-fns/tz"
import { addDays, addMinutes, format, startOfDay, subDays } from "date-fns"
import * as schema from "./schema"
import type { Database } from "./connect"

/** Every demo account shares this password (also listed in the README). */
export const DEMO_PASSWORD = "GymFuel123"
const SEED_TZ = "Europe/London"
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&auto=format&fit=crop&q=60`

const RECIPES = [
  {
    title: "Salmon grain bowl",
    description: "Seared salmon over quinoa with greens, cucumber and a lemon-yoghurt dressing.",
    instructions:
      "1. Cook the quinoa.\n2. Season and sear the salmon skin-side down for 4 minutes, flip for 2.\n3. Whisk yoghurt, lemon and dill.\n4. Build the bowl and spoon over the dressing.",
    prepTime: 10, cookTime: 15, servings: 1, difficulty: "easy" as const,
    imageUrl: unsplash("1547592180-85f173990554"),
    tags: ["high-protein", "omega-3", "lunch"],
    ingredients: [
      { name: "Salmon fillet", quantity: 150, unit: "g" },
      { name: "Quinoa", quantity: 60, unit: "g" },
      { name: "Spinach", quantity: 40, unit: "g" },
      { name: "Greek yoghurt", quantity: 50, unit: "g" },
    ],
    calories: 640, protein: 46, carbs: 48, fat: 26,
  },
  {
    title: "Chicken rice power bowl",
    description: "Meal-prep classic: chicken thighs, jasmine rice, broccoli and sweet chilli.",
    instructions:
      "1. Roast seasoned chicken at 200°C for 22 minutes.\n2. Steam the broccoli.\n3. Slice chicken and serve over rice with sweet chilli.",
    prepTime: 10, cookTime: 25, servings: 2, difficulty: "easy" as const,
    imageUrl: unsplash("1546069901-ba9599a7e63c"),
    tags: ["meal-prep", "bulk", "dinner"],
    ingredients: [
      { name: "Chicken thighs", quantity: 400, unit: "g" },
      { name: "Jasmine rice", quantity: 150, unit: "g" },
      { name: "Broccoli", quantity: 1, unit: "head" },
    ],
    calories: 690, protein: 56, carbs: 72, fat: 18,
  },
  {
    title: "Protein overnight oats",
    description: "Oats, whey and Greek yoghurt soaked overnight, topped with berries.",
    instructions: "Mix oats, whey, yoghurt and milk in a jar. Refrigerate overnight. Top with berries.",
    prepTime: 5, cookTime: 0, servings: 1, difficulty: "easy" as const,
    imageUrl: unsplash("1488477181946-6428a0291777"),
    tags: ["breakfast", "no-cook"],
    ingredients: [
      { name: "Rolled oats", quantity: 60, unit: "g" },
      { name: "Whey protein", quantity: 30, unit: "g" },
      { name: "Greek yoghurt", quantity: 100, unit: "g" },
      { name: "Blueberries", quantity: 80, unit: "g" },
    ],
    calories: 520, protein: 42, carbs: 58, fat: 12,
  },
  {
    title: "Steak & sweet potato",
    description: "Sirloin with crispy sweet potato wedges and garlic green beans.",
    instructions:
      "1. Roast sweet potato wedges at 220°C for 30 minutes.\n2. Sear steak 3 minutes per side, rest 5.\n3. Sauté green beans with garlic.",
    prepTime: 10, cookTime: 35, servings: 1, difficulty: "medium" as const,
    imageUrl: unsplash("1504674900247-0877df9cc836"),
    tags: ["bulk", "dinner"],
    ingredients: [
      { name: "Sirloin steak", quantity: 220, unit: "g" },
      { name: "Sweet potato", quantity: 250, unit: "g" },
      { name: "Green beans", quantity: 100, unit: "g" },
    ],
    calories: 780, protein: 58, carbs: 62, fat: 30,
  },
  {
    title: "Eggs & avocado sourdough",
    description: "Three eggs, smashed avocado and chilli flakes on toasted sourdough.",
    instructions: "Toast the sourdough, smash the avocado with lime and salt, top with eggs cooked your way.",
    prepTime: 5, cookTime: 8, servings: 1, difficulty: "easy" as const,
    imageUrl: unsplash("1525351484163-7529414344d8"),
    tags: ["breakfast", "vegetarian"],
    ingredients: [
      { name: "Eggs", quantity: 3, unit: "" },
      { name: "Sourdough", quantity: 2, unit: "slices" },
      { name: "Avocado", quantity: 0.5, unit: "" },
    ],
    calories: 560, protein: 28, carbs: 40, fat: 32,
  },
]

type LogSeed = { title: string; at: [number, number]; foods: string[]; n: [number, number, number, number]; fav?: boolean }
const DAY_PLAN: LogSeed[] = [
  { title: "Protein overnight oats", at: [8, 10], foods: ["Rolled oats", "Whey protein", "Greek yoghurt", "Blueberries"], n: [520, 42, 58, 12], fav: true },
  { title: "Chicken rice power bowl", at: [13, 5], foods: ["Chicken thighs", "Jasmine rice", "Broccoli"], n: [690, 56, 72, 18] },
  { title: "Protein shake & banana", at: [16, 30], foods: ["Whey protein", "Banana", "Milk"], n: [340, 32, 40, 6] },
  { title: "Salmon grain bowl", at: [19, 20], foods: ["Salmon fillet", "Quinoa", "Spinach"], n: [640, 46, 48, 26], fav: true },
]

/** Wipes every table, then creates the demo accounts and their data. */
export async function seedDemoData(db: Database, now = new Date()) {
  await db.delete(schema.coachClients)
  await db.delete(schema.mealLogs)
  await db.delete(schema.pantryIngredients)
  await db.delete(schema.groceryItems)
  await db.delete(schema.recipes)
  await db.delete(schema.users)

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const [alex, coach] = await db
    .insert(schema.users)
    .values([
      {
        email: "alex@gymfuel.test",
        username: "alex",
        fullName: "Alex Morgan",
        passwordHash,
        role: "client",
        clientCode: "A1B2C3D4E5F60718",
        dietaryRestrictions: [],
        preferences: {
          dailyCalorieTarget: 2600,
          dailyProteinTarget: 180,
          fitnessGoal: "bulk",
          preferredCuisines: ["Mexican", "Japanese"],
          dislikedIngredients: ["Mushrooms"],
          maxPrepTimeMinutes: 45,
        },
      },
      {
        email: "coach@gymfuel.test",
        username: "coachjo",
        fullName: "Jo Carter",
        passwordHash,
        role: "coach",
        clientCode: "C0AC4C0DE0000001",
      },
      {
        email: "sam@gymfuel.test",
        username: "sam",
        fullName: "Sam Patel",
        passwordHash,
        role: "client",
        clientCode: "5A3D9C1E7B2F4A60",
        dietaryRestrictions: ["Vegetarian"],
        preferences: { dailyCalorieTarget: 2100, dailyProteinTarget: 130, fitnessGoal: "cut" },
      },
    ])
    .returning()

  await db.insert(schema.coachClients).values({ coachId: coach.id, clientId: alex.id })

  const savedRecipes = await db
    .insert(schema.recipes)
    .values(RECIPES.map((recipe) => ({ ...recipe, userId: alex.id })))
    .returning()
  const recipeByTitle = new Map(savedRecipes.map((recipe) => [recipe.title, recipe.id]))

  // Six full days of history plus today's meals that have already "happened".
  const today = startOfDay(new TZDate(now, SEED_TZ))
  const logs: (typeof schema.mealLogs.$inferInsert)[] = []
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const day = subDays(today, daysAgo)
    DAY_PLAN.forEach((meal, index) => {
      // Skip a few meals so the history (and the coach's view) isn't perfectly uniform.
      if (daysAgo > 0 && (daysAgo + index) % 5 === 0) return
      const eatenAt = addMinutes(day, meal.at[0] * 60 + meal.at[1])
      if (eatenAt > now) return
      const [calories, protein, carbs, fat] = meal.n
      logs.push({
        userId: alex.id,
        title: meal.title,
        foods: meal.foods.map((name) => ({ name })),
        calories, protein, carbs, fat,
        eatenAt,
        favorite: Boolean(meal.fav && daysAgo === 0) || Boolean(meal.fav && daysAgo === 3),
        sourceRecipeId: recipeByTitle.get(meal.title) ?? null,
      })
    })
  }
  if (logs.length) await db.insert(schema.mealLogs).values(logs)

  const pantry = ["Chicken breast", "Eggs", "Greek yoghurt", "Jasmine rice", "Spinach", "Rolled oats", "Sweet potato"]
  await db.insert(schema.pantryIngredients).values(
    pantry.map((name) => ({ userId: alex.id, name, normalizedName: name.toLowerCase() }))
  )

  const inDays = (n: number) => format(addDays(today, n), "yyyy-MM-dd")
  await db.insert(schema.groceryItems).values([
    { userId: alex.id, name: "Semi-skimmed milk", quantity: 2, unit: "L", category: "Dairy", expirationDate: inDays(1) },
    { userId: alex.id, name: "Chicken thighs", quantity: 1, unit: "kg", category: "Meat", expirationDate: inDays(3) },
    { userId: alex.id, name: "Blueberries", quantity: 250, unit: "g", category: "Fruits", expirationDate: inDays(5) },
    { userId: alex.id, name: "Broccoli", quantity: 2, unit: "piece", category: "Vegetables", expirationDate: inDays(9) },
    { userId: alex.id, name: "Whey protein", quantity: 1, unit: "kg", category: "Other", checked: true },
    { userId: alex.id, name: "Sourdough", quantity: 1, unit: "piece", category: "Grains", expirationDate: inDays(-1) },
  ])

  return { users: 3, recipes: savedRecipes.length, mealLogs: logs.length }
}
