import { z } from "zod"

/** Collapses runs of whitespace and trims, like the old API's validators. */
const clean = (value: string) => value.split(/\s+/).filter(Boolean).join(" ")
const cleanText = (max: number) => z.string().transform(clean).pipe(z.string().min(1).max(max))
const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value ? clean(value) : null))
    .pipe(z.string().max(max).nullable())

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const
export const GOALS = ["cut", "maintain", "bulk"] as const
export const UNITS = ["piece", "kg", "g", "lb", "oz", "L", "mL", "cup", "tbsp", "tsp"] as const
export const CATEGORIES = ["Dairy", "Meat", "Vegetables", "Fruits", "Grains", "Spices", "Condiments", "Beverages", "Other"] as const

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/\d/, "Add a number")

export const registerSchema = z
  .object({
    fullName: optionalText(120),
    username: z
      .string()
      .trim()
      .min(3, "At least 3 characters")
      .max(30)
      .regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, dots, dashes and underscores only"),
    email: z.email("Enter a valid email").transform((value) => value.trim().toLowerCase()),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["client", "coach"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email"),
  password: z.string().min(1, "Enter your password"),
})

export const nutritionSchema = z.object({
  calories: z.coerce.number().min(0).max(10_000),
  protein: z.coerce.number().min(0).max(1_000),
  carbs: z.coerce.number().min(0).max(2_000),
  fat: z.coerce.number().min(0).max(1_000),
})

export const foodSchema = z.object({
  name: cleanText(120),
  portion: optionalText(120),
})

export const mealLogInputSchema = z.object({
  title: cleanText(200),
  foods: z.array(foodSchema).min(1, "Add at least one food").max(30),
  nutrition: nutritionSchema,
  eatenAt: z.iso.datetime({ offset: true }),
  notes: optionalText(2000),
  favorite: z.boolean().default(false),
  sourceRecipeId: z.number().int().positive().nullable().optional(),
})
export type MealLogInput = z.input<typeof mealLogInputSchema>

export const groceryItemSchema = z.object({
  name: cleanText(120),
  quantity: z.coerce.number().positive().max(100_000),
  unit: z.enum(UNITS),
  category: z.enum(CATEGORIES),
  expirationDate: z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(z.iso.date().nullable()),
})

const optionalNumber = (max: number) =>
  z.preprocess((value) => (value === "" || value == null ? null : value), z.coerce.number().min(0).max(max).nullable())

export const recipeInputSchema = z.object({
  title: cleanText(200),
  description: optionalText(1000),
  instructions: z
    .string()
    .optional()
    .transform((value) => value?.trim() || null)
    .pipe(z.string().max(10_000).nullable()),
  prepTime: optionalNumber(1440),
  cookTime: optionalNumber(1440),
  servings: optionalNumber(50),
  difficulty: z.enum(["easy", "medium", "hard"]),
  calories: optionalNumber(10_000),
  protein: optionalNumber(1_000),
  carbs: optionalNumber(2_000),
  fat: optionalNumber(1_000),
  ingredientsText: z.string().max(5_000).optional().default(""),
  tagsText: z.string().max(500).optional().default(""),
})

/** Comma-separated text field → de-duplicated list (case-insensitive). */
export function commaList(value: unknown, max = 30): string[] {
  if (typeof value !== "string") return []
  const seen = new Set<string>()
  const items: string[] = []
  for (const raw of value.split(",")) {
    const item = clean(raw)
    if (item && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase())
      items.push(item.slice(0, 60))
    }
  }
  return items.slice(0, max)
}

export const profileSchema = z.object({
  fullName: optionalText(120),
  dailyCalorieTarget: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(500, "Between 500 and 10,000 kcal").max(10_000, "Between 500 and 10,000 kcal").optional()
  ),
  dailyProteinTarget: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(10, "Between 10 and 1,000 g").max(1_000, "Between 10 and 1,000 g").optional()
  ),
  fitnessGoal: z.enum(GOALS),
  maxPrepTimeMinutes: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(5, "Between 5 and 240 minutes").max(240, "Between 5 and 240 minutes").optional()
  ),
})

/** Structured output we ask the AI for (every field required — OpenAI strict mode). */
export const generatedRecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  instructions: z.string(),
  prepTime: z.number().int(),
  cookTime: z.number().int(),
  servings: z.number().int(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      availableInPantry: z.boolean(),
    })
  ),
  nutrition: z.object({ calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() }),
  missingIngredients: z.array(z.string()),
})
export type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>

export const mealAnalysisSchema = z.object({
  title: z.string(),
  foods: z.array(z.object({ name: z.string(), portion: z.string().nullable() })),
  nutrition: z.object({ calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() }),
  assumptions: z.array(z.string()),
})
export type MealAnalysis = z.infer<typeof mealAnalysisSchema>

export function normalizeName(name: string) {
  return clean(name).toLowerCase()
}

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form"
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".")
    if (key && !errors[key]) errors[key] = issue.message
  }
  return errors
}
