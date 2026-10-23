"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { BookmarkPlus, Check, ChevronDown, Clock, Utensils } from "lucide-react"
import { toast } from "sonner"
import { saveGeneratedRecipe } from "@/app/actions/recipes"
import { MacroGrid } from "@/components/meals/macros"
import type { MealDraft } from "@/components/meals/meal-editor-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { GeneratedRecipe } from "@/lib/validation"

export function recipeToMealDraft(recipe: GeneratedRecipe, sourceRecipeId?: number | null): MealDraft {
  return {
    title: recipe.title,
    foods: recipe.ingredients.map((item) => ({ name: item.name, portion: `${item.quantity || ""} ${item.unit}`.trim() || null })),
    nutrition: recipe.nutrition,
    eatenAt: new Date().toISOString(),
    favorite: false,
    sourceRecipeId: sourceRecipeId ?? null,
  }
}

export function GeneratedRecipeCard({
  recipe,
  onLog,
  showPantry = true,
  className,
}: {
  recipe: GeneratedRecipe
  onLog?: (draft: MealDraft) => void
  showPantry?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [savedId, setSavedId] = useState<number>()
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      const result = await saveGeneratedRecipe(recipe)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSavedId(result.data.id)
      toast.success("Saved to Recipes")
    })

  return (
    <article className={cn("flex flex-col rounded-2xl border bg-card p-5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-accent text-accent-foreground">High protein</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> {recipe.prepTime + recipe.cookTime} min · {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug">{recipe.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{recipe.description}</p>
      <MacroGrid macros={recipe.nutrition} className="mt-4" />
      {showPantry && recipe.missingIngredients.length > 0 && (
        <p className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-xs text-foreground">
          <span className="font-medium">Missing:</span> {recipe.missingIngredients.join(", ")}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-4 flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        {open ? "Hide" : "Show"} ingredients &amp; method
      </button>
      {open && (
        <div className="mt-4 grid gap-5 border-t pt-4 text-sm">
          <ul className="flex flex-col gap-1.5">
            {recipe.ingredients.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center gap-2">
                {showPantry && (
                  <span
                    className={cn("size-2 rounded-full", item.availableInPantry ? "bg-success" : "bg-warning")}
                    title={item.availableInPantry ? "In your kitchen" : "Need to buy"}
                  />
                )}
                <span className="tabular text-muted-foreground">
                  {item.quantity || ""} {item.unit}
                </span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
          <p className="leading-7 whitespace-pre-line text-muted-foreground">{recipe.instructions}</p>
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {savedId ? (
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/recipes/${savedId}`}>
              <Check data-icon="inline-start" /> Saved — view
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="flex-1" onClick={save} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <BookmarkPlus data-icon="inline-start" />} Save recipe
          </Button>
        )}
        {onLog && (
          <Button className="flex-1" onClick={() => onLog(recipeToMealDraft(recipe, savedId))}>
            <Utensils data-icon="inline-start" /> Log when eaten
          </Button>
        )}
      </div>
    </article>
  )
}
