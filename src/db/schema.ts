import { relations, sql } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

export type Role = "client" | "coach"
export type FitnessGoal = "cut" | "maintain" | "bulk"
export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

/** Free-form profile settings that drive targets and AI prompts. */
export type UserPreferences = {
  dailyCalorieTarget?: number
  dailyProteinTarget?: number
  fitnessGoal?: FitnessGoal
  preferredCuisines?: string[]
  dislikedIngredients?: string[]
  maxPrepTimeMinutes?: number
}

export type FoodComponent = { name: string; portion?: string | null }
export type RecipeIngredient = { name: string; quantity?: number | null; unit?: string | null }
export type Nutrition = { calories: number; protein: number; carbs: number; fat: number }

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  fullName: varchar("full_name", { length: 120 }),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 10 }).$type<Role>().notNull().default("client"),
  // Shared with a coach so they can link to this account.
  clientCode: varchar("client_code", { length: 16 }).notNull().unique(),
  dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>().notNull().default([]),
  preferences: jsonb("preferences").$type<UserPreferences>().notNull().default({}),
  ...timestamps,
})

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    instructions: text("instructions"),
    prepTime: integer("prep_time"),
    cookTime: integer("cook_time"),
    servings: integer("servings"),
    difficulty: varchar("difficulty", { length: 10 }).$type<"easy" | "medium" | "hard">(),
    imageUrl: text("image_url"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    ingredients: jsonb("ingredients").$type<RecipeIngredient[]>().notNull().default([]),
    calories: real("calories"),
    protein: real("protein"),
    carbs: real("carbs"),
    fat: real("fat"),
    ...timestamps,
  },
  (t) => [index("recipes_user_idx").on(t.userId)]
)

/** A meal the user actually ate (confirmed from Lens, AI, a recipe or by hand). */
export const mealLogs = pgTable(
  "meal_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    foods: jsonb("foods").$type<FoodComponent[]>().notNull().default([]),
    calories: real("calories").notNull().default(0),
    protein: real("protein").notNull().default(0),
    carbs: real("carbs").notNull().default(0),
    fat: real("fat").notNull().default(0),
    eatenAt: timestamp("eaten_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    favorite: boolean("favorite").notNull().default(false),
    sourceRecipeId: integer("source_recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [index("meal_logs_user_eaten_idx").on(t.userId, t.eatenAt)]
)

/** Lightweight "what I have in the kitchen" list that feeds AI recipe generation. */
export const pantryIngredients = pgTable(
  "pantry_ingredients",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 120 }).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("pantry_user_name_uq").on(t.userId, t.normalizedName)]
)

export const groceryItems = pgTable(
  "grocery_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    quantity: real("quantity").notNull().default(1),
    unit: varchar("unit", { length: 20 }),
    category: varchar("category", { length: 40 }),
    expirationDate: date("expiration_date", { mode: "string" }),
    checked: boolean("checked").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("grocery_user_idx").on(t.userId)]
)

export const coachClients = pgTable(
  "coach_clients",
  {
    id: serial("id").primaryKey(),
    coachId: integer("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Unique: a client has at most one coach.
    clientId: integer("client_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index("coach_clients_coach_idx").on(t.coachId)]
)

export const usersRelations = relations(users, ({ many }) => ({
  recipes: many(recipes),
  mealLogs: many(mealLogs),
}))

export const recipesRelations = relations(recipes, ({ one }) => ({
  user: one(users, { fields: [recipes.userId], references: [users.id] }),
}))

export const mealLogsRelations = relations(mealLogs, ({ one }) => ({
  user: one(users, { fields: [mealLogs.userId], references: [users.id] }),
  sourceRecipe: one(recipes, { fields: [mealLogs.sourceRecipeId], references: [recipes.id] }),
}))

export const coachClientsRelations = relations(coachClients, ({ one }) => ({
  coach: one(users, { fields: [coachClients.coachId], references: [users.id] }),
  client: one(users, { fields: [coachClients.clientId], references: [users.id] }),
}))

export type User = typeof users.$inferSelect
export type Recipe = typeof recipes.$inferSelect
export type MealLog = typeof mealLogs.$inferSelect
export type PantryIngredient = typeof pantryIngredients.$inferSelect
export type GroceryItem = typeof groceryItems.$inferSelect
