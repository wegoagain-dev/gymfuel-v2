"use client"

import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"
import { PackageOpen, Plus, SlidersHorizontal, WandSparkles, X } from "lucide-react"
import { toast } from "sonner"
import { addPantryIngredient, generateFromPantry, removePantryIngredient } from "@/app/actions/pantry"
import { MealEditorDialog, type MealEditorState } from "@/components/meals/meal-editor-dialog"
import { GeneratedRecipeCard } from "@/components/recipes/generated-recipe-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section aria-labelledby="kitchen-title" className="rounded-2xl border bg-card p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 id="kitchen-title" className="font-semibold">In your kitchen</h2>
            <Badge variant="secondary" className="tabular">{optimistic.length}</Badge>
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              add()
            }}
          >
            <Input placeholder="Chicken, rice, spinach…" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} aria-label="Ingredient" />
            <Button type="submit" disabled={!name.trim() || adding}>
              {adding ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />} Add
            </Button>
          </form>
          {optimistic.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {optimistic.map((ingredient) => (
                <li key={ingredient.id} className="inline-flex h-9 items-center gap-1 rounded-full border bg-background pr-1 pl-3.5 text-sm">
                  {ingredient.name}
                  <Button variant="ghost" size="icon-xs" className="rounded-full" onClick={() => remove(ingredient)} aria-label={`Remove ${ingredient.name}`}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
              <PackageOpen className="size-6" />
              Add what you have so ideas use it first.
            </div>
          )}
        </section>

        <section aria-labelledby="generate-title" className="flex flex-col gap-4 rounded-2xl border bg-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="generate-title" className="flex items-center gap-2 font-semibold">
              <WandSparkles className="size-4 text-primary" /> Generate gym meals
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/profile"><SlidersHorizontal data-icon="inline-start" /> Preferences</Link>
            </Button>
          </div>
          <Field>
            <FieldLabel>Goal</FieldLabel>
            <ToggleGroup type="single" variant="outline" value={goal} onValueChange={(value) => value && setGoal(value as FitnessGoal)} className="w-full">
              {GOALS.map((item) => (
                <ToggleGroupItem key={item.value} value={item.value} className="h-auto flex-1 flex-col gap-0 py-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground">{item.note}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Field orientation="horizontal" className="justify-between">
            <FieldLabel>Meal</FieldLabel>
            <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type[0].toUpperCase() + type.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Button size="lg" className="mt-auto h-11" onClick={generate} disabled={generating}>
            {generating ? <Spinner data-icon="inline-start" /> : <WandSparkles data-icon="inline-start" />}
            {generating ? "Building three recipes…" : "Generate three recipes"}
          </Button>
          {aiMode === "demo" && <p className="text-xs text-muted-foreground">Demo AI is on (no OpenAI key) — recipes come from a built-in template.</p>}
        </section>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generating ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((key) => <Skeleton key={key} className="h-80 rounded-2xl" />)}
        </div>
      ) : recipes.length ? (
        <section aria-labelledby="ideas-title" className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 id="ideas-title" className="text-lg font-semibold">Fresh ideas</h2>
              <p className="text-xs text-muted-foreground">Nutrition is estimated per serving. Green dots are already in your kitchen.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
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
