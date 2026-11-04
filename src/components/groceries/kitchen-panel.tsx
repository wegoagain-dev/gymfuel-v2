"use client"

import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"
import { PackageOpen, Plus, SlidersHorizontal, WandSparkles, X } from "lucide-react"
import { toast } from "sonner"
import { addPantryIngredient, generateFromPantry, removePantryIngredient } from "@/app/actions/pantry"
import { MealEditorDialog, type MealEditorState } from "@/components/meals/meal-editor-dialog"
import { GeneratedRecipeCard } from "@/components/recipes/generated-recipe-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { FitnessGoal, MealType } from "@/db/schema"
import type { GeneratedRecipe } from "@/lib/validation"

const GOALS: { value: FitnessGoal; label: string; note: string }[] = [
  { value: "cut", label: "Cut", note: "Lighter" },
  { value: "maintain", label: "Maintain", note: "Balanced" },
  { value: "bulk", label: "Bulk", note: "Denser" },
]
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"]
const capitalise = (value: string) => value[0].toUpperCase() + value.slice(1)

type Ingredient = { id: number; name: string }

export function KitchenPanel({ ingredients, defaultGoal, aiMode }: { ingredients: Ingredient[]; defaultGoal: FitnessGoal; aiMode: "openai" | "demo" }) {
  const [name, setName] = useState("")
  const [goal, setGoal] = useState<FitnessGoal>(defaultGoal)
  const [mealType, setMealType] = useState<MealType>("dinner")
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([])
  const [error, setError] = useState<string>()
  const [editor, setEditor] = useState<MealEditorState>(null)
  const [adding, startAdding] = useTransition()
  const [generating, startGenerating] = useTransition()
  const [, startRemoving] = useTransition()
  const [optimistic, removeOptimistic] = useOptimistic(ingredients, (current, id: number) => current.filter((item) => item.id !== id))

  const add = () => {
    const value = name.trim()
    if (!value) return
    startAdding(async () => {
      const result = await addPantryIngredient(value)
      if (result.ok) setName("")
      else toast.error(result.error)
    })
  }

  const remove = (ingredient: Ingredient) =>
    startRemoving(async () => {
      removeOptimistic(ingredient.id)
      const result = await removePantryIngredient(ingredient.id)
      if (!result.ok) toast.error(result.error)
    })

  const generate = () =>
    startGenerating(async () => {
      setError(undefined)
      const result = await generateFromPantry({ goal, mealType })
      if (result.ok) setRecipes(result.data)
      else setError(result.error)
    })

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section aria-labelledby="kitchen-title" className="flex min-w-0 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="kitchen-title" className="display min-w-0 text-xl">In your kitchen</h2>
          <p className="rx shrink-0 text-xs text-muted-foreground">
            {optimistic.length} {optimistic.length === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="tray flex min-w-0 flex-col">
          <form
            className="flex items-center gap-2 p-2"
            onSubmit={(event) => {
              event.preventDefault()
              add()
            }}
          >
            <Input
              className="h-10 min-w-0 flex-1 border-transparent bg-surface"
              placeholder="Chicken, rice, spinach"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              aria-label="Ingredient"
            />
            <Button type="submit" variant="outline" disabled={!name.trim() || adding}>
              {adding ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />} Add
            </Button>
          </form>

          {optimistic.length ? (
            <ul className="flex flex-wrap gap-2 border-t border-rule p-3">
              {optimistic.map((ingredient) => (
                <li key={ingredient.id} className="moulded flex h-10 max-w-full items-center gap-1 rounded-full bg-card pr-1 pl-3.5">
                  <span className="truncate text-sm font-medium text-ink">{ingredient.name}</span>
                  <Button variant="ghost" size="icon-sm" className="rounded-full text-ink-2 focus-visible:text-ink active:bg-accent" onClick={() => remove(ingredient)} aria-label={`Remove ${ingredient.name}`}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="border-t border-rule">
              <EmptyHeader>
                <EmptyMedia variant="icon"><PackageOpen /></EmptyMedia>
                <EmptyTitle>Nothing in the kitchen yet</EmptyTitle>
                <EmptyDescription>Add what you have so ideas use it first.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </section>

      <section aria-labelledby="generate-title" className="surface flex min-w-0 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 id="generate-title" className="display flex items-center gap-2 text-xl">
            <WandSparkles className="size-5 shrink-0 text-signal-deep dark:text-signal" aria-hidden="true" /> Generate gym meals
          </h2>
          <p className="text-sm text-ink-2">Three recipes built from what you have and your goal.</p>
        </div>

        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel>Goal</FieldLabel>
            <Button variant="ghost" size="sm" asChild className="-mr-2 h-8 text-muted-foreground">
              <Link href="/profile"><SlidersHorizontal data-icon="inline-start" /> Preferences</Link>
            </Button>
          </div>
          <ToggleGroup type="single" variant="outline" value={goal} onValueChange={(value) => value && setGoal(value as FitnessGoal)} className="w-full">
            {GOALS.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value} className="h-auto flex-1 flex-col gap-0.5 py-2">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.note}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field orientation="horizontal" className="justify-between">
          <FieldLabel>Meal</FieldLabel>
          <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map((type) => <SelectItem key={type} value={type}>{capitalise(type)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Button size="lg" className="mt-auto w-full" onClick={generate} disabled={generating}>
          {generating ? <Spinner data-icon="inline-start" /> : <WandSparkles data-icon="inline-start" />}
          {generating ? "Building three recipes…" : "Generate three recipes"}
        </Button>
        {aiMode === "demo" && <p className="text-xs text-muted-foreground">Demo AI is on (no OpenAI key), so recipes come from a built-in template.</p>}
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generating ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[minmax(0,1fr)]">
          {[0, 1, 2].map((key) => <Skeleton key={key} className="h-64 rounded-[14px]" />)}
        </div>
      ) : recipes.length ? (
        <section aria-labelledby="ideas-title" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="ideas-title" className="display text-xl">Fresh ideas</h2>
            <p className="text-sm text-muted-foreground">Nutrition is estimated per serving. Open a recipe to see which ingredients are already in your kitchen.</p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[minmax(0,1fr)]">
            {recipes.map((recipe) => (
              <GeneratedRecipeCard
                key={recipe.title}
                recipe={recipe}
                onLog={(draft) => setEditor({ draft, mode: { kind: "create" }, estimate: true })}
              />
            ))}
          </div>
        </section>
      ) : null}

      <MealEditorDialog state={editor} onClose={() => setEditor(null)} />
    </div>
  )
}
