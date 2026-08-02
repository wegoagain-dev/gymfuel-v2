/* eslint-disable @typescript-eslint/no-explicit-any -- legacy FastAPI adapters normalize heterogeneous JSON records here */
// API client for the GymFuel backend

import {
    Recipe,
    Meal,
    GroceryItem,
    ClientSummary,
    CoachSummary,
    FitnessGoal,
    GeneratedGymRecipe,
    GymMealType,
    MealAnalysisDraft,
    MealLog,
    MealLogInput,
    MealPreferences,
    MealSuggestionInput,
    PantryIngredient,
} from './types'

// API_BASE_URL: Empty string = relative URLs (works through nginx reverse proxy)
// In development without Docker, you can set NEXT_PUBLIC_API_URL=http://localhost:8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// Token management
// We store the JWT token in localStorage to persist sessions
export function getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
}

export function setToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('auth_token', token)
}

export function removeToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('auth_token')
}

// API client class
class ApiClient {
    private baseUrl: string

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
    }

    // Generic request wrapper that handles:
    // 1. Attaching the JWT token to headers
    // 2. Handling 401 Unauthorized errors (auto-logout)
    // 3. Parsing JSON responses/errors
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = getToken()
        const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
        const headers: Record<string, string> = {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers as Record<string, string>),
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        })

        if (response.status === 401) {
            // Unauthorized - clear token and redirect to login
            removeToken()
            throw new Error('Unauthorized')
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
            // Handle FastAPI validation errors (422)
            if (Array.isArray(error.detail)) {
                const validationErrors = error.detail
                    .map((err: any) => err.msg.replace(/^Value error,\s*/i, ''))
                    .join(', ')
                throw new Error(validationErrors)
            }
            throw new Error(error.detail || 'Request failed')
        }

        if (response.status === 204) {
            return undefined as T
        }

        const text = await response.text()
        if (!text) {
            return undefined as T
        }

        try {
            return JSON.parse(text) as T
        } catch {
            return text as T
        }
    }

    // Auth endpoints
    async register(data: {
        email: string
        username: string
        password: string
        role?: 'client' | 'coach'
        full_name?: string
        dietary_restrictions?: string[]
        preferences?: Record<string, unknown>
    }) {
        return this.request<{ id: string; email: string; username: string; role: string; client_code: string }>('/api/auth/register/', {
            method: 'POST',
            body: JSON.stringify({ ...data, role: data.role || 'client' }),
        })
    }

    async login(email: string, password: string) {
        const formData = new URLSearchParams()
        formData.append('username', email) // Backend expects 'username' field
        formData.append('password', password)

        const response = await fetch(`${this.baseUrl}/api/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Login failed' }))
            throw new Error(error.detail || 'Login failed')
        }

        return response.json() as Promise<{ access_token: string; token_type: string }>
    }

    async getMe() {
        return this.request<{
            id: string
            email: string
            username: string
            full_name?: string
            role: 'client' | 'coach'
            client_code?: string
            dietary_restrictions?: string[]
            preferences?: Record<string, unknown>
        }>('/api/auth/me/')
    }

    async updateNutritionTargets(dailyCalorieTarget: number, dailyProteinTarget: number) {
        return this.request<{
            daily_calorie_target: number
            daily_protein_target: number
        }>('/api/auth/me/nutrition-targets', {
            method: 'PATCH',
            body: JSON.stringify({
                daily_calorie_target: dailyCalorieTarget,
                daily_protein_target: dailyProteinTarget,
            }),
        })
    }

    async updateMealPreferences(preferences: MealPreferences) {
        return this.request('/api/auth/me/meal-preferences', {
            method: 'PATCH',
            body: JSON.stringify({
                dietary_restrictions: preferences.dietaryRestrictions,
                preferred_cuisines: preferences.preferredCuisines,
                disliked_ingredients: preferences.dislikedIngredients,
                max_prep_time_minutes: preferences.maxPrepTimeMinutes ?? null,
                fitness_goal: preferences.fitnessGoal,
            }),
        })
    }

    // ============ GymFuel Lens Endpoints ============

    async getMealLogs(filters: { startAt?: string; endAt?: string; favorite?: boolean } = {}): Promise<MealLog[]> {
        const params = new URLSearchParams()
        if (filters.startAt) params.set('start_at', filters.startAt)
        if (filters.endAt) params.set('end_at', filters.endAt)
        if (filters.favorite !== undefined) params.set('favorite', String(filters.favorite))
        const query = params.size ? `?${params.toString()}` : ''
        const logs = await this.request<any[]>(`/api/meal-logs/${query}`)
        return logs.map(this.mapMealLog)
    }

    async analyzeMealPhoto(photo: Blob, portionContext?: string): Promise<MealAnalysisDraft> {
        const form = new FormData()
        form.append('photo', photo, 'meal.jpg')
        if (portionContext?.trim()) form.append('portion_context', portionContext.trim())
        const draft = await this.request<any>('/api/meal-logs/analyze', {
            method: 'POST',
            body: form,
        })
        return {
            title: draft.title,
            foods: draft.foods || [],
            nutritionalInfo: draft.nutritional_info,
            assumptions: draft.assumptions || [],
        }
    }

    async suggestMeal(input: MealSuggestionInput): Promise<GeneratedGymRecipe> {
        const response = await this.request<any>('/api/meal-logs/suggest', {
            method: 'POST',
            body: JSON.stringify({
                meal_type: input.mealType,
                available_time_minutes: input.availableTimeMinutes,
                remaining_calories: input.remainingCalories,
                remaining_protein: input.remainingProtein,
            }),
        })
        const recipe = response.recipe
        return {
            title: recipe.title,
            description: recipe.description || '',
            instructions: recipe.instructions,
            prepTime: recipe.prep_time,
            cookTime: recipe.cook_time,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            tags: recipe.tags || [],
            ingredients: (recipe.ingredients || []).map((ingredient: any) => ({
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                availableInPantry: ingredient.available_in_pantry,
            })),
            nutritionalInfo: recipe.nutritional_info,
            missingIngredients: recipe.missing_ingredients || [],
        }
    }

    async createMealLog(input: MealLogInput): Promise<MealLog> {
        const response = await this.request<any>('/api/meal-logs/', {
            method: 'POST',
            body: JSON.stringify(this.mealLogPayload(input)),
        })
        return this.mapMealLog(response)
    }

    async updateMealLog(id: string, input: Partial<MealLogInput>): Promise<MealLog> {
        const response = await this.request<any>(`/api/meal-logs/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(this.mealLogPayload(input)),
        })
        return this.mapMealLog(response)
    }

    async deleteMealLog(id: string) {
        return this.request<void>(`/api/meal-logs/${id}`, { method: 'DELETE' })
    }

    async getPantry(): Promise<PantryIngredient[]> {
        const ingredients = await this.request<any[]>('/api/pantry/')
        return ingredients.map(item => ({
            id: String(item.id),
            userId: String(item.user_id),
            name: item.name,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
        }))
    }

    async addPantryIngredient(name: string): Promise<PantryIngredient> {
        const item = await this.request<any>('/api/pantry/', {
            method: 'POST',
            body: JSON.stringify({ name }),
        })
        return {
            id: String(item.id),
            userId: String(item.user_id),
            name: item.name,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
        }
    }

    async deletePantryIngredient(id: string) {
        return this.request<void>(`/api/pantry/${id}`, { method: 'DELETE' })
    }

    async generatePantryRecipes(goal: FitnessGoal, mealType: GymMealType): Promise<GeneratedGymRecipe[]> {
        const response = await this.request<any>('/api/pantry/generate', {
            method: 'POST',
            body: JSON.stringify({ goal, meal_type: mealType }),
        })
        return (response.recipes || []).map((recipe: any) => ({
            title: recipe.title,
            description: recipe.description || '',
            instructions: recipe.instructions,
            prepTime: recipe.prep_time,
            cookTime: recipe.cook_time,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            tags: recipe.tags || [],
            ingredients: (recipe.ingredients || []).map((ingredient: any) => ({
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                availableInPantry: ingredient.available_in_pantry,
            })),
            nutritionalInfo: recipe.nutritional_info,
            missingIngredients: recipe.missing_ingredients || [],
        }))
    }

    async saveGeneratedRecipe(recipe: GeneratedGymRecipe): Promise<Recipe> {
        const response = await this.request<any>('/api/recipes/', {
            method: 'POST',
            body: JSON.stringify({
                title: recipe.title,
                description: recipe.description,
                instructions: recipe.instructions,
                prep_time: recipe.prepTime,
                cook_time: recipe.cookTime,
                servings: recipe.servings,
                difficulty: recipe.difficulty,
                tags: recipe.tags,
                ingredients: recipe.ingredients.map(ingredient => ({
                    name: ingredient.name,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                })),
                nutritional_info: recipe.nutritionalInfo,
            }),
        })
        return {
            id: String(response.id),
            title: response.title,
            description: response.description || '',
            ingredients: (response.ingredients || []).map((ingredient: any) => ingredient.name || ingredient),
            instructions: response.instructions,
            prepTime: response.prep_time || 0,
            cookTime: response.cook_time || 0,
            servings: response.servings || 1,
            difficulty: response.difficulty
                ? `${response.difficulty.charAt(0).toUpperCase()}${response.difficulty.slice(1)}` as Recipe['difficulty']
                : 'Easy',
            tags: response.tags || [],
            imageUrl: response.image_url,
            nutritionalInfo: response.nutritional_info || undefined,
            createdAt: response.created_at,
        }
    }

    private mapMealLog(log: any): MealLog {
        return {
            id: String(log.id),
            userId: String(log.user_id),
            title: log.title,
            foods: log.foods || [],
            nutritionalInfo: log.nutritional_info,
            eatenAt: log.eaten_at,
            notes: log.notes || undefined,
            favorite: Boolean(log.favorite),
            sourceRecipeId: log.source_recipe_id ? String(log.source_recipe_id) : undefined,
            createdAt: log.created_at,
            updatedAt: log.updated_at,
        }
    }

    private mealLogPayload(input: Partial<MealLogInput>) {
        return {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.foods !== undefined ? { foods: input.foods } : {}),
            ...(input.nutritionalInfo !== undefined ? { nutritional_info: input.nutritionalInfo } : {}),
            ...(input.eatenAt !== undefined ? { eaten_at: input.eatenAt } : {}),
            ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
            ...(input.favorite !== undefined ? { favorite: input.favorite } : {}),
            ...(input.sourceRecipeId !== undefined
                ? { source_recipe_id: input.sourceRecipeId ? Number(input.sourceRecipeId) : null }
                : {}),
        }
    }

    // Recipe endpoints
    async getRecipes(): Promise<Recipe[]> {
        const backendRecipes = await this.request<any[]>('/api/recipes/')
        // Transform backend format to frontend format
        return backendRecipes.map(r => ({
            id: String(r.id),
            title: r.title,
            description: r.description || '',
            ingredients: (r.ingredients || []).map((i: any) => i.name || i),
            instructions: r.instructions,
            prepTime: r.prep_time || 0,
            cookTime: r.cook_time || 0,
            servings: r.servings || 1,
            difficulty: r.difficulty ? (r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)) as Recipe['difficulty'] : 'Easy',
            tags: r.tags || [],
            imageUrl: r.image_url,
            nutritionalInfo: r.nutritional_info || undefined,
            createdAt: r.created_at
        }))
    }

    async createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>) {
        // Transform frontend format to backend format
        const backendRecipe = {
            title: recipe.title,
            description: recipe.description || '',
            instructions: recipe.instructions,
            prep_time: recipe.prepTime,
            cook_time: recipe.cookTime,
            servings: recipe.servings,
            difficulty: recipe.difficulty?.toLowerCase(),
            tags: recipe.tags || [],
            // Convert ingredients from string array to backend format
            ingredients: (recipe.ingredients || []).map(ing => ({
                name: ing,
                quantity: 1,
                unit: ''
            })),
            nutritional_info: recipe.nutritionalInfo || {}
        }
        const response = await this.request<any>('/api/recipes/', {
            method: 'POST',
            body: JSON.stringify(backendRecipe),
        })
        return {
            id: String(response.id),
            title: response.title,
            description: response.description || '',
            ingredients: (response.ingredients || []).map((i: any) => i.name || i),
            instructions: response.instructions,
            prepTime: response.prep_time || 0,
            cookTime: response.cook_time || 0,
            servings: response.servings || 1,
            difficulty: response.difficulty ? (response.difficulty.charAt(0).toUpperCase() + response.difficulty.slice(1)) as Recipe['difficulty'] : 'Easy',
            tags: response.tags || [],
            imageUrl: response.image_url,
            nutritionalInfo: response.nutritional_info || undefined,
            createdAt: response.created_at
        }
    }

    async deleteRecipe(id: string) {
        return this.request<void>(`/api/recipes/${id}`, {
            method: 'DELETE',
        })
    }

    // AI Recipe Generation (requires auth)
    async generateAIRecipe(prompt: string, dietaryRestrictions?: string): Promise<Omit<Recipe, 'id' | 'createdAt'>> {
        const params = new URLSearchParams({ prompt })
        if (dietaryRestrictions) {
            params.append('dietary_restrictions', dietaryRestrictions)
        }
        const backendRecipe = await this.request<any>(`/api/recipes/ai/generate?${params.toString()}`, {
            method: 'POST',
        })
        return {
            title: backendRecipe.title,
            description: backendRecipe.description || '',
            ingredients: (backendRecipe.ingredients || []).map((i: any) => i.name || i),
            instructions: backendRecipe.instructions,
            prepTime: backendRecipe.prep_time || 0,
            cookTime: backendRecipe.cook_time || 0,
            servings: backendRecipe.servings || 1,
            difficulty: backendRecipe.difficulty ? (backendRecipe.difficulty.charAt(0).toUpperCase() + backendRecipe.difficulty.slice(1)) as Recipe['difficulty'] : 'Easy',
            tags: backendRecipe.tags || [],
            imageUrl: backendRecipe.image_url,
            nutritionalInfo: backendRecipe.nutritional_info || undefined,
        }
    }

    // Grocery endpoints
    async getGroceryItems(): Promise<GroceryItem[]> {
        const backendItems = await this.request<any[]>('/api/groceries/')
        // Transform backend format (snake_case) to frontend format (camelCase)
        return backendItems.map(item => ({
            id: String(item.id),
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || '',
            category: item.category || '',
            expirationDate: item.expiration_date || undefined,
            createdAt: item.created_at
        }))
    }

    async createGroceryItem(item: Omit<GroceryItem, 'id' | 'createdAt'>): Promise<GroceryItem> {
        // Transform frontend format to backend format
        const backendItem = {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            expiration_date: item.expirationDate
        }
        const response = await this.request<any>('/api/groceries/', {
            method: 'POST',
            body: JSON.stringify(backendItem),
        })
        // Transform response back to frontend format
        return {
            id: String(response.id),
            name: response.name,
            quantity: response.quantity,
            unit: response.unit || '',
            category: response.category || '',
            expirationDate: response.expiration_date || undefined,
            createdAt: response.created_at
        }
    }

    async updateGroceryItem(item: GroceryItem): Promise<GroceryItem> {
        // Transform frontend format to backend format
        const backendItem = {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            expiration_date: item.expirationDate
        }
        const response = await this.request<any>(`/api/groceries/${item.id}`, {
            method: 'PUT',
            body: JSON.stringify(backendItem),
        })
        // Transform response back to frontend format
        return {
            id: String(response.id),
            name: response.name,
            quantity: response.quantity,
            unit: response.unit || '',
            category: response.category || '',
            expirationDate: response.expiration_date || undefined,
            createdAt: response.created_at
        }
    }

    async deleteGroceryItem(id: string) {
        return this.request<void>(`/api/groceries/${id}`, {
            method: 'DELETE',
        })
    }

    // Meal endpoints
    async getMeals() {
        const backendMeals = await this.request<any[]>('/api/meals/')
        return backendMeals.map(m => ({
            id: String(m.id),
            date: m.date,
            mealType: m.meal_type,
            recipeId: m.recipe_id ? String(m.recipe_id) : undefined,
            recipeName: m.recipe ? m.recipe.title : 'Unknown Recipe',
            notes: m.notes,
            createdAt: m.created_at,
            recipe: m.recipe ? {
                id: String(m.recipe.id),
                title: m.recipe.title,
                description: m.recipe.description || '',
                ingredients: (m.recipe.ingredients || []).map((i: any) => i.name || i),
                instructions: m.recipe.instructions,
                prepTime: m.recipe.prep_time || 0,
                cookTime: m.recipe.cook_time || 0,
                servings: m.recipe.servings || 1,
                difficulty: m.recipe.difficulty ? (m.recipe.difficulty.charAt(0).toUpperCase() + m.recipe.difficulty.slice(1)) as Recipe['difficulty'] : 'Easy',
                tags: m.recipe.tags || [],
                imageUrl: m.recipe.image_url,
                nutritionalInfo: m.recipe.nutritional_info || undefined,
                createdAt: m.recipe.created_at
            } : undefined
        }))
    }

    async createMeal(meal: Omit<Meal, 'id' | 'createdAt'>) {
        // Transform frontend format to backend format
        const backendMeal = {
            date: meal.date,
            meal_type: meal.mealType,
            recipe_id: meal.recipeId,
            notes: meal.notes,
            planned: true
        }
        const response = await this.request<any>('/api/meals/', {
            method: 'POST',
            body: JSON.stringify(backendMeal),
        })

        // Map response back to frontend format
        return {
            id: String(response.id),
            date: response.date,
            mealType: response.meal_type,
            recipeId: response.recipe_id ? String(response.recipe_id) : undefined,
            recipeName: response.recipe ? response.recipe.title : (meal.recipeName || 'Unknown Recipe'),
            notes: response.notes,
            createdAt: response.created_at
        }
    }


    async updateMeal(meal: Meal) {
        // Transform frontend format to backend format
        const backendMeal = {
            date: meal.date,
            meal_type: meal.mealType,
            recipe_id: meal.recipeId ? Number(meal.recipeId) : null,
            notes: meal.notes,
            planned: true
        }

        const response = await this.request<any>(`/api/meals/${meal.id}`, {
            method: 'PUT',
            body: JSON.stringify(backendMeal),
        })

        // Map response back to frontend format
        return {
            id: String(response.id),
            date: response.date,
            mealType: response.meal_type,
            recipeId: response.recipe_id ? String(response.recipe_id) : undefined,
            recipeName: response.recipe ? response.recipe.title : (meal.recipeName || 'Unknown Recipe'),
            notes: response.notes,
            createdAt: response.created_at,
            recipe: response.recipe ? {
                id: String(response.recipe.id),
                title: response.recipe.title,
                description: response.recipe.description || '',
                ingredients: (response.recipe.ingredients || []).map((i: any) => i.name || i),
                instructions: response.recipe.instructions,
                prepTime: response.recipe.prep_time || 0,
                cookTime: response.recipe.cook_time || 0,
                servings: response.recipe.servings || 1,
                difficulty: response.recipe.difficulty ? (response.recipe.difficulty.charAt(0).toUpperCase() + response.recipe.difficulty.slice(1)) as Recipe['difficulty'] : 'Easy',
                tags: response.recipe.tags || [],
                imageUrl: response.recipe.image_url,
                nutritionalInfo: response.recipe.nutritional_info || undefined,
                createdAt: response.recipe.created_at
            } : undefined
        }
    }

    async deleteMeal(id: string) {
        return this.request<{ message: string }>(`/api/meals/${id}`, {
            method: 'DELETE',
        })
    }

    // ============ Coach Endpoints ============

    async linkClient(clientEmail: string, clientCode: string) {
        return this.request<{ message: string }>('/api/coach/link/', {
            method: 'POST',
            body: JSON.stringify({ client_email: clientEmail, client_code: clientCode }),
        })
    }

    async unlinkClient(clientId: number) {
        return this.request<{ message: string }>(`/api/coach/unlink/${clientId}`, {
            method: 'DELETE',
        })
    }

    async getClients(): Promise<ClientSummary[]> {
        return this.request<ClientSummary[]>('/api/coach/clients/')
    }

    async getClientMeals(clientId: number): Promise<Meal[]> {
        const backendMeals = await this.request<any[]>(`/api/coach/clients/${clientId}/meals`)
        return backendMeals.map(m => ({
            id: String(m.id),
            date: m.date,
            mealType: m.meal_type,
            recipeId: m.recipe_id ? String(m.recipe_id) : undefined,
            recipeName: m.recipe ? m.recipe.title : 'Unknown Recipe',
            notes: m.notes,
            createdAt: m.created_at
        }))
    }

    async getClientRecipes(clientId: number): Promise<Recipe[]> {
        const backendRecipes = await this.request<any[]>(`/api/coach/clients/${clientId}/recipes`)
        return backendRecipes.map(r => ({
            id: String(r.id),
            title: r.title,
            description: r.description || '',
            ingredients: (r.ingredients || []).map((i: any) => i.name || i),
            instructions: r.instructions,
            prepTime: r.prep_time || 0,
            cookTime: r.cook_time || 0,
            servings: r.servings || 1,
            difficulty: r.difficulty ? (r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)) as Recipe['difficulty'] : 'Easy',
            tags: r.tags || [],
            imageUrl: r.image_url,
            nutritionalInfo: r.nutritional_info || undefined,
            createdAt: r.created_at
        }))
    }

    async getMyCoach(): Promise<CoachSummary> {
        return this.request<CoachSummary>('/api/coach/my-coach/')
    }
}

export const api = new ApiClient(API_BASE_URL)
