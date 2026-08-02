// Data models for RecipeRadar MVP

export interface NutritionalInfo {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
}

export interface Recipe {
    id: string
    title: string
    description: string
    ingredients: string[]
    instructions: string
    prepTime: number // in minutes
    cookTime: number // in minutes
    servings: number
    difficulty: 'Easy' | 'Medium' | 'Hard'
    tags: string[]
    imageUrl?: string
    nutritionalInfo?: NutritionalInfo
    createdAt: string
}

export interface Meal {
    id: string
    date: string // ISO date string
    mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
    recipeId?: string
    recipeName?: string
    notes?: string
    createdAt: string
    recipe?: Recipe
}

export interface GroceryItem {
    id: string
    name: string
    quantity: number
    unit: string
    category: string
    expirationDate?: string // ISO date string
    createdAt: string
}

export interface User {
    id: string
    email: string
    username: string
    full_name?: string
    role: 'client' | 'coach'
    client_code?: string
    dietary_restrictions?: string[]
    preferences?: Record<string, unknown>
}

export interface MealPreferences {
    dietaryRestrictions: string[]
    preferredCuisines: string[]
    dislikedIngredients: string[]
    maxPrepTimeMinutes?: number
    fitnessGoal: FitnessGoal
}

export interface ClientSummary {
    id: number
    username: string
    email: string
    full_name?: string
}

export interface CoachSummary {
    id: number
    username: string
    email: string
    full_name?: string
}

// GymFuel Lens records are confirmed meals, deliberately separate from Meal planning.
export interface FoodComponent {
    name: string
    portion?: string
}

export interface NutritionEstimate {
    calories: number
    protein: number
    carbs: number
    fat: number
}

export interface MealAnalysisDraft {
    title: string
    foods: FoodComponent[]
    nutritionalInfo: NutritionEstimate
    assumptions: string[]
}

export interface MealLog {
    id: string
    userId: string
    title: string
    foods: FoodComponent[]
    nutritionalInfo: NutritionEstimate
    eatenAt: string
    notes?: string
    favorite: boolean
    sourceRecipeId?: string
    createdAt: string
    updatedAt: string
}

export interface MealLogInput {
    title: string
    foods: FoodComponent[]
    nutritionalInfo: NutritionEstimate
    eatenAt: string
    notes?: string
    favorite: boolean
    sourceRecipeId?: string
}

export interface PantryIngredient {
    id: string
    userId: string
    name: string
    createdAt: string
    updatedAt: string
}

export type FitnessGoal = 'cut' | 'maintain' | 'bulk'
export type GymMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealSuggestionInput {
    mealType: GymMealType
    availableTimeMinutes: number
    remainingCalories?: number
    remainingProtein?: number
}

export interface GeneratedIngredient {
    name: string
    quantity: number
    unit: string
    availableInPantry: boolean
}

export interface GeneratedGymRecipe {
    title: string
    description: string
    instructions: string
    prepTime: number
    cookTime: number
    servings: number
    difficulty: 'easy' | 'medium' | 'hard'
    tags: string[]
    ingredients: GeneratedIngredient[]
    nutritionalInfo: NutritionEstimate
    missingIngredients: string[]
}
