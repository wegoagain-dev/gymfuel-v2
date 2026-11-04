"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { BookmarkPlus, Check, ChevronDown, Clock, Utensils } from "lucide-react"
import { toast } from "sonner"
import { saveGeneratedRecipe } from "@/app/actions/recipes"
import { MacroGrid } from "@/components/meals/macros"
import type { MealDraft } from "@/components/meals/meal-editor-dialog"
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

/** Spaced dashes read as commas on screen; ranges such as 10-12 keep their hyphen. */
const readable = (text: string) =>
  text
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1-$2")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/\s+\u00b7\s+/g, ", ")

/** Steps for the method: line breaks the model wrote win; a single paragraph splits on sentence ends. */
function toSteps(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
  const steps = lines.length > 1 ? lines : lines.flatMap((line) => line.split(/(?<=[.!?])\s+/))
  return steps.map((step) => step.trim()).filter(Boolean)
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
  const ref = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const [savedId, setSavedId] = useState<number>()
  const [pending, startTransition] = useTransition()
  const [inDialog, setInDialog] = useState(false)
  const steps = toSteps(readable(recipe.instructions))

  // Inside a sheet or dialog the sheet is already the one surface, so this card drops its own.
  useEffect(() => {
    setInDialog(Boolean(ref.current?.closest('[role="dialog"]')))
  }, [])

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
    <article ref={ref} className={cn("flex flex-col", inDialog ? "p-0" : "surface p-4 md:p-5", className)}>
      <h3 className="display text-xl leading-snug">{recipe.title}</h3>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <span className="font-medium text-ink-2">High protein</span>
        <span className="rx inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          {recipe.prepTime + recipe.cookTime} min
        </span>
        <span className="rx text-muted-foreground">{recipe.servings} serving{recipe.servings === 1 ? "" : "s"}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{readable(recipe.description)}</p>
      <MacroGrid macros={recipe.nutrition} className="mt-4" />

      {showPantry && recipe.missingIngredients.length > 0 && (
        <p className="mt-3 border-t border-rule pt-3 text-xs text-muted-foreground">
          <span className="font-medium text-ink-2">Missing</span> {recipe.missingIngredients.join(", ")}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-3 flex min-h-10 items-center justify-between gap-2 border-t border-rule pt-3 text-left text-sm font-medium text-ink-2 transition-colors duration-(--dur-micro) ease-(--ease-out) hover:text-ink focus-visible:outline-offset-2"
      >
        {open ? "Hide" : "Show"} ingredients and method
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-(--dur-short) ease-(--ease-out) motion-reduce:transition-none", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-5 text-sm">
          <ul className="flex flex-col">
            {recipe.ingredients.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-rule py-2 first:border-t-0 first:pt-0">
                <span className="rx min-w-16 shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {item.quantity || ""} {item.unit}
                </span>
                <span className="min-w-0 flex-1 text-ink">{item.name}</span>
                {showPantry && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.availableInPantry ? "In pantry" : "Need to buy"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {steps.length > 0 && (
            <ol className="flex flex-col border-t border-rule pt-3">
              {steps.map((step, index) => (
                <li key={`${index}-${step.slice(0, 12)}`} className="flex gap-3 py-1.5 first:pt-0 last:pb-0">
                  <span className="rx shrink-0 pt-0.5 text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 leading-relaxed text-ink-2">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {savedId ? (
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/recipes/${savedId}`}>
              <Check data-icon="inline-start" /> View saved recipe
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
